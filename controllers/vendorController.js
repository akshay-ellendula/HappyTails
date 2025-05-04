const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { Vendor, Order, OrderItem, Product, ProductVariant, ProductImage, User } = require('../models/database');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/products/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Fetch vendor orders
const getVendorOrders = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const statusFilter = req.query.status || 'all';

    try {
        const matchStage = {
            'products.vendor_id': mongoose.Types.ObjectId(vendorId)
        };
        if (statusFilter !== 'all') {
            matchStage['orders.status'] = statusFilter;
        }

        const orders = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $match: matchStage },
            {
                $project: {
                    id: '$_id',
                    order_date: 1,
                    status: 1,
                    total_amount: 1,
                    user_name: { $arrayElemAt: ['$user.name', 0] },
                    products: {
                        $map: {
                            input: '$order_items',
                            as: 'item',
                            in: '$$item.product_name'
                        }
                    }
                }
            },
            { $sort: { order_date: -1 } }
        ]);

        res.render('shop-orders', {
            vendor: req.session.vendor,
            orders: orders.map(order => ({
                id: order.id,
                order_id: `#ORD-${order.id}`,
                customer: order.user_name || 'Unknown',
                products: order.products.join(', '),
                total: order.total_amount.toFixed(2),
                date: new Date(order.order_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
                status: order.status
            })),
            status: statusFilter
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Server error');
    }
};

// Fetch vendor products
const getVendorProducts = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;

    try {
        const products = await Product.aggregate([
            { $match: { vendor_id: mongoose.Types.ObjectId(vendorId) } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            {
                $lookup: {
                    from: 'productimages',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'images',
                    pipeline: [{ $match: { is_primary: true } }]
                }
            },
            {
                $project: {
                    id: '$_id',
                    product_name: 1,
                    product_category: 1,
                    product_type: 1,
                    sale_price: { $arrayElemAt: ['$variants.sale_price', 0] },
                    stock_quantity: { $arrayElemAt: ['$variants.stock_quantity', 0] },
                    image_path: { $arrayElemAt: ['$images.image_path', 0] }
                }
            }
        ]);

        const productsWithSold = await Promise.all(products.map(async (product) => {
            const sold = await OrderItem.aggregate([
                { $match: { product_id: product.id } },
                {
                    $group: {
                        _id: null,
                        sold: { $sum: '$quantity' }
                    }
                }
            ]);
            return {
                ...product,
                sold: sold[0]?.sold || 0,
                image_path: product.image_path || '/images/default.jpg'
            };
        }));

        res.render('shop-products', {
            vendor: req.session.vendor,
            products: productsWithSold
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Server error');
    }
};

// Fetch vendor profile
const getVendorProfile = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;

    try {
        const vendorDetails = await Vendor.findById(vendorId).select('store_name name email contact_number store_location');

        const totalRevenue = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$price', '$quantity'] } }
                }
            }
        ]);

        const productsSold = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: null,
                    productsSold: { $sum: '$quantity' }
                }
            }
        ]);

        const newOrders = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            {
                $match: {
                    'products.vendor_id': mongoose.Types.ObjectId(vendorId),
                    status: 'Pending'
                }
            },
            {
                $group: {
                    _id: null,
                    newOrders: { $sum: 1 }
                }
            }
        ]);

        const recentOrders = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $match: { 'products.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            { $sort: { order_date: -1 } },
            { $limit: 4 },
            {
                $project: {
                    id: '$_id',
                    order_date: 1,
                    status: 1,
                    total_amount: 1,
                    user_name: { $arrayElemAt: ['$user.name', 0] },
                    product_name: { $arrayElemAt: ['$order_items.product_name', 0] }
                }
            }
        ]);

        res.render('shop-profile', {
            vendor: {
                store_name: vendorDetails.store_name,
                owner_name: vendorDetails.name,
                email: vendorDetails.email,
                phone: vendorDetails.contact_number,
                address: vendorDetails.store_location,
                description: 'Happy Tails specializes in high-quality, eco-friendly pet accessories for cats and dogs. All our products are designed with pet comfort and safety in mind, using sustainable materials whenever possible.'
            },
            totalRevenue: (totalRevenue[0]?.totalRevenue || 0).toFixed(2),
            productsSold: productsSold[0]?.productsSold || 0,
            newOrders: newOrders[0]?.newOrders || 0,
            recentOrders,
            customerRatings: '4.8/5'
        });
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).send('Server error');
    }
};

// Service provider login
const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;
    console.log('Login attempt:', { email, role });

    if (!email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    try {
        let Model, sessionKey, redirect;
        if (role === 'store-manager') {
            Model = Vendor;
            sessionKey = 'vendor';
        } else if (role === 'event-manager') {
            Model = EventManager;
            sessionKey = 'eventManager';
        } else {
            return res.status(400).json({ success: false, message: 'Invalid role. Use "store-manager" or "event-manager"' });
        }

        const user = await Model.findOne({ email });
        if (!user) {
            console.log('User not found for email:', email);
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        req.session[sessionKey] = {
            id: user._id.toString(),
            email: user.email,
            role,
            store_name: user.store_name || null
        };
        console.log('Session set:', req.session[sessionKey]);

        if (role === 'store-manager') {
            const storeNameSlug = user.store_name.toLowerCase().replace(/\s+/g, '-');
            redirect = `/shop-dashboard/${storeNameSlug}`;
        } else if (role === 'event-manager') {
            redirect = '/eventmanager_dashboard';
        }

        console.log('Redirecting to:', redirect);
        res.status(200).json({ success: true, message: 'Login successful', redirect });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Fetch vendor dashboard
const getVendorDashboard = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const storeNameSlug = req.params.storeName;
    const expectedStoreNameSlug = vendor.store_name.toLowerCase().replace(/\s+/g, '-');

    if (storeNameSlug !== expectedStoreNameSlug) {
        return res.status(403).send('Unauthorized: You can only access your own dashboard.');
    }

    const vendorId = vendor.id;

    try {
        const totalRevenue = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$price', '$quantity'] } }
                }
            }
        ]);

        const productsSold = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: null,
                    productsSold: { $sum: '$quantity' }
                }
            }
        ]);

        const newOrders = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            {
                $match: {
                    'products.vendor_id': mongoose.Types.ObjectId(vendorId),
                    status: 'Pending'
                }
            },
            {
                $group: {
                    _id: null,
                    newOrders: { $sum: 1 }
                }
            }
        ]);

        const recentOrders = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $match: { 'products.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            { $sort: { order_date: -1 } },
            { $limit: 4 },
            {
                $project: {
                    id: '$_id',
                    order_date: 1,
                    status: 1,
                    total_amount: 1,
                    user_name: { $arrayElemAt: ['$user.name', 0] },
                    product_name: { $arrayElemAt: ['$order_items.product_name', 0] }
                }
            }
        ]);

        res.render('shop-dashboard', {
            vendor: req.session.vendor,
            totalRevenue: (totalRevenue[0]?.totalRevenue || 0).toFixed(2),
            productsSold: productsSold[0]?.productsSold || 0,
            newOrders: newOrders[0]?.newOrders || 0,
            recentOrders
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Server error');
    }
};

// Store signup
const storeSignup = async (req, res) => {
    const { name, contact_number, email, password, confirmpassword, store_name, store_location } = req.body;

    if (!name || !contact_number || !email || !password || !store_name || !store_location) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (!/^\d{10}$/.test(contact_number)) return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email format' });
    if (password.length < 8 || !/\d/.test(password)) return res.status(400).json({ success: false, message: 'Password must be 8+ characters with a number' });
    if (password !== confirmpassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (store_name.length < 2) return res.status(400).json({ success: false, message: 'Store name must be at least 2 characters' });
    if (store_location.length < 3) return res.status(400).json({ success: false, message: 'Invalid store location' });

    try {
        const existingVendor = await Vendor.findOne({ email });
        if (existingVendor) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const vendor = new Vendor({
            name,
            contact_number,
            email,
            password: hashedPassword,
            store_name,
            store_location
        });
        await vendor.save();

        res.status(201).json({ success: true, redirect: '/shop-dashboard', message: 'Vendor signup successful' });
    } catch (error) {
        console.error('Error during vendor signup:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Logout
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Server error');
        }
        res.redirect('/service_provider_login');
    });
};

// Fetch product data for editing
const getProductForEdit = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const productId = req.params.productId;

    try {
        const product = await Product.findOne({ _id: productId, vendor_id: vendorId });
        if (!product) {
            return res.redirect('/shop-products?error=Product not found or you do not have permission to edit it.');
        }

        const variants = await ProductVariant.find({ product_id: productId });
        const images = await ProductImage.find({ product_id: productId });

        res.render('shop-product-edit', {
            vendor: req.session.vendor,
            product: {
                id: product._id,
                product_name: product.product_name,
                product_category: product.product_category,
                product_type: product.product_type,
                product_description: product.product_description,
                stock_status: product.stock_status,
                variants: variants || [],
                images: images || []
            }
        });
    } catch (error) {
        console.error('Error fetching product for edit:', error);
        res.redirect('/shop-products?error=Server error while fetching product data.');
    }
};

// Update product
const updateProduct = [
    upload.array('productImages', 4),
    async (req, res) => {
        if (!req.session.vendor) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const vendorId = req.session.vendor.id;
        const productId = req.params.productId;
        const {
            productName,
            productCategory,
            productType,
            productDescription,
            stock_status,
            'variant_size[]': variantSizes,
            'variant_color[]': variantColors,
            'variant_regular_price[]': variantRegularPrices,
            'variant_sale_price[]': variantSalePrices,
            'variant_stock_quantity[]': variantStockQuantities
        } = req.body;

        if (!productName || !productCategory || !productType || !productDescription || !stock_status) {
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        if (!variantSizes || !variantRegularPrices || !variantStockQuantities) {
            return res.status(400).json({ success: false, message: 'At least one variant with size, regular price, and stock quantity is required' });
        }

        if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        try {
            const product = await Product.findOne({ _id: productId, vendor_id: vendorId });
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found or you do not have permission to edit it.' });
            }

            await Product.updateOne(
                { _id: productId },
                {
                    product_name: productName,
                    product_category: productCategory,
                    product_type: productType,
                    product_description: productDescription,
                    stock_status
                }
            );

            await ProductVariant.deleteMany({ product_id: productId });

            const variants = variantSizes.map((size, i) => ({
                product_id: productId,
                size: size ? size.trim() : null,
                color: variantColors[i] ? variantColors[i].trim() : null,
                regular_price: parseFloat(variantRegularPrices[i]),
                sale_price: variantSalePrices[i] ? parseFloat(variantSalePrices[i]) : null,
                stock_quantity: parseInt(variantStockQuantities[i])
            }));

            for (const variant of variants) {
                if (!variant.regular_price || variant.regular_price <= 0) {
                    return res.status(400).json({ success: false, message: 'Regular price must be a positive number' });
                }
                if (isNaN(variant.stock_quantity) || variant.stock_quantity < 0) {
                    return res.status(400).json({ success: false, message: 'Stock quantity must be a non-negative number' });
                }
                if (variant.sale_price && variant.sale_price >= variant.regular_price) {
                    return res.status(400).json({ success: false, message: 'Sale price must be less than regular price for all variants' });
                }
            }

            await ProductVariant.insertMany(variants);

            if (req.files && req.files.length > 0) {
                await ProductImage.deleteMany({ product_id: productId });
                const images = req.files.map((file, index) => ({
                    product_id: productId,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: index === 0
                }));
                await ProductImage.insertMany(images);
            }

            res.status(200).json({ success: true, message: 'Product updated successfully', redirect: '/shop-products' });
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
];

// Fetch vendor customers
const getVendorCustomers = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;

    try {
        const customers = await User.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'orders'
                }
            },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'orders._id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            { $match: { 'products.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: '$_id',
                    user_name: { $first: '$name' },
                    email: { $first: '$email' },
                    total_orders: { $sum: 1 },
                    total_spent: { $sum: '$orders.total_amount' },
                    last_order_date: { $max: '$orders.order_date' }
                }
            },
            { $sort: { last_order_date: -1 } }
        ]);

        const formattedCustomers = customers.map((customer, index) => ({
            customer_id: `C${String(index + 1).padStart(3, '0')}`,
            user_id: customer._id,
            name: customer.user_name,
            email: customer.email,
            total_orders: customer.total_orders,
            total_spent: customer.total_spent ? customer.total_spent.toFixed(2) : '0.00',
            last_order: customer.last_order_date
                ? new Date(customer.last_order_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                  })
                : 'N/A'
        }));

        res.render('shop-customers', {
            vendor: req.session.vendor,
            customers: formattedCustomers
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).send('Server error');
    }
};

// Submit new product
const submitProduct = [
    upload.array('product_images', 4),
    async (req, res) => {
        if (!req.session.vendor) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const vendorId = req.session.vendor.id;
        const {
            product_name,
            product_category,
            product_type,
            product_description,
            stock_status,
            'variant_size[]': variantSizes,
            'variant_color[]': variantColors,
            'variant_regular_price[]': variantRegularPrices,
            'variant_sale_price[]': variantSalePrices,
            'variant_stock_quantity[]': variantStockQuantities
        } = req.body;

        if (!product_name || !product_category || !product_type || !product_description || !stock_status) {
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        if (!variantSizes || !variantRegularPrices || !variantStockQuantities || variantSizes.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one variant with size, regular price, and stock quantity is required' });
        }

        if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        try {
            const product = new Product({
                vendor_id: vendorId,
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status
            });
            await product.save();

            const variants = variantSizes.map((size, i) => ({
                product_id: product._id,
                size: size ? size.trim() : null,
                color: variantColors[i] ? variantColors[i].trim() : null,
                regular_price: parseFloat(variantRegularPrices[i]),
                sale_price: variantSalePrices[i] ? parseFloat(variantSalePrices[i]) : null,
                stock_quantity: parseInt(variantStockQuantities[i])
            }));

            for (const variant of variants) {
                if (isNaN(variant.regular_price) || variant.regular_price <= 0) {
                    return res.status(400).json({ success: false, message: 'Regular price must be a positive number' });
                }
                if (isNaN(variant.stock_quantity) || variant.stock_quantity < 0) {
                    return res.status(400).json({ success: false, message: 'Stock quantity must be a non-negative number' });
                }
                if (variant.sale_price && variant.sale_price >= variant.regular_price) {
                    return res.status(400).json({ success: false, message: 'Sale price must be less than regular price' });
                }
            }

            await ProductVariant.insertMany(variants);

            if (req.files && req.files.length > 0) {
                const images = req.files.map((file, index) => ({
                    product_id: product._id,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: index === 0
                }));
                await ProductImage.insertMany(images);
            }

            res.status(200).json({ success: true, message: 'Product added successfully', redirect: '/shop-products' });
        } catch (error) {
            console.error('Error adding product:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
];

module.exports = {
    storeSignup,
    serviceProviderLogin,
    getVendorDashboard,
    logout,
    getVendorProfile,
    getVendorProducts,
    getProductForEdit,
    updateProduct,
    getVendorOrders,
    getVendorCustomers,
    submitProduct
};