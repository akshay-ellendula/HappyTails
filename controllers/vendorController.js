const bcrypt = require('bcryptjs');
const { Vendor, Order, OrderItem, Product, ProductVariant, ProductImage, User, EventManager } = require('../models/database');
const mongoose = require('mongoose');
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
        let matchStage = { 'products.vendor_id': mongoose.Types.ObjectId(vendorId) };
        if (statusFilter !== 'all') {
            matchStage['status'] = statusFilter;
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
            { $match: matchStage },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $group: {
                    _id: '$_id',
                    id: { $first: '$_id' },
                    order_date: { $first: '$order_date' },
                    status: { $first: '$status' },
                    total_amount: { $first: '$total_amount' },
                    user_name: { $first: '$user.user_name' },
                    products: { $first: '$order_items.product_name' }
                }
            },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    order_date: 1,
                    status: 1,
                    total_amount: 1,
                    user_name: 1,
                    products: {
                        $reduce: {
                            input: '$products',
                            initialValue: '',
                            in: {
                                $concat: [
                                    '$$value',
                                    { $cond: [{ $eq: ['$$value', ''] }, '', ', '] },
                                    '$$this'
                                ]
                            }
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
                customer: order.user_name,
                products: order.products,
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

const getVendorProducts = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const vendorId = vendor.id;

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
                    as: 'images'
                }
            },
            {
                $unwind: {
                    path: '$images',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: { 'images.is_primary': true } },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'order_items'
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
                    image_path: { $ifNull: ['$images.image_path', '/images/default.jpg'] },
                    sold: { $sum: '$order_items.quantity' },
                    _id: 0
                }
            }
        ]);

        res.render('shop-products', {
            vendor: req.session.vendor,
            products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Server error');
    }
};

const getVendorProfile = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const vendorId = vendor.id;

    try {
        const vendorDetails = await Vendor.findById(vendorId);

        const totalRevenue = await Order.aggregate([
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
            { $match: { 'products.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            {
                $unwind: '$order_items'
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: { $ifNull: ['$totalRevenue', 0] }
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
            },
            {
                $project: {
                    _id: 0,
                    productsSold: { $ifNull: ['$productsSold', 0] }
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
            },
            {
                $project: {
                    _id: 0,
                    newOrders: { $ifNull: ['$newOrders', 0] }
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
                $match: {
                    'products.vendor_id': mongoose.Types.ObjectId(vendorId)
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
            { $unwind: '$user' },
            { $unwind: '$order_items' },
            {
                $project: {
                    id: '$_id',
                    order_date: 1,
                    status: 1,
                    total_amount: 1,
                    user_name: '$user.user_name',
                    product_name: '$order_items.product_name',
                    _id: 0
                }
            },
            { $sort: { order_date: -1 } },
            { $limit: 4 }
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
        const totalRevenue = await Order.aggregate([
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
            { $match: { 'products.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            {
                $unwind: '$order_items'
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: { $ifNull: ['$totalRevenue', 0] }
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
            },
            {
                $project: {
                    _id: 0,
                    productsSold: { $ifNull: ['$productsSold', 0] }
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
            },
            {
                $project: {
                    _id: 0,
                    newOrders: { $ifNull: ['$newOrders', 0] }
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
                $match: {
                    'products.vendor_id': mongoose.Types.ObjectId(vendorId)
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
            { $unwind: '$user' },
            { $unwind: '$order_items' },
            {
                $project: {
                    id: '$_id',
                    order_date: 1,
                    status: 1,
                    total_amount: 1,
                    user_name: '$user.user_name',
                    product_name: '$order_items.product_name',
                    _id: 0
                }
            },
            { $sort: { order_date: -1 } },
            { $limit: 4 }
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

const storeSignup = async (req, res) => {
    const { name, contactnumber, email, password, confirmpassword, storename, storelocation } = req.body;

    if (!name || !contactnumber || !email || !password || !storename || !storelocation) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (!/^\d{10}$/.test(contactnumber)) return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email format' });
    if (password.length < 8 || !/\d/.test(password)) return res.status(400).json({ success: false, message: 'Password must be 8+ characters with a number' });
    if (password !== confirmpassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (storename.length < 2) return res.status(400).json({ success: false, message: 'Store name must be at least 2 characters' });
    if (storelocation.length < 3) return res.status(400).json({ success: false, message: 'Invalid store location' });

    try {
        const existingVendor = await Vendor.findOne({ email });
        if (existingVendor) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newVendor = await Vendor.create({
            name,
            contact_number: contactnumber,
            email,
            password: hashedPassword,
            store_name: storename,
            store_location: storelocation
        });

        req.session.vendor = {
            id: newVendor._id.toString(),
            email: newVendor.email,
            store_name: newVendor.store_name
        };

        const storeNameSlug = newVendor.store_name.toLowerCase().replace(/\s+/g, '-');
        const redirectUrl = `/shop-dashboard/${storeNameSlug}`;

        res.status(201).json({
            success: true,
            redirect: redirectUrl,
            message: 'Vendor signup successful'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Server error');
        }
        res.redirect('/service_provider_login');
    });
};

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

            const variants = variantSizes.map((size, i) => {
                const regularPrice = parseFloat(variantRegularPrices[i]);
                const salePrice = variantSalePrices[i] ? parseFloat(variantSalePrices[i]) : null;
                const stockQuantity = parseInt(variantStockQuantities[i]);

                if (!regularPrice || !stockQuantity) {
                    throw new Error('Regular price and stock quantity are required for each variant');
                }

                if (salePrice && salePrice >= regularPrice) {
                    throw new Error('Sale price must be less than regular price for all variants');
                }

                return {
                    product_id: productId,
                    size: size || null,
                    color: variantColors[i] || null,
                    regular_price: regularPrice,
                    sale_price: salePrice,
                    stock_quantity: stockQuantity
                };
            });

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
            res.status(500).json({ success: false, message: error.message || 'Server error' });
        }
    }
];

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
                    customer_id: { $first: '$_id' },
                    user_name: { $first: '$user_name' },
                    email: { $first: '$user_email' },
                    total_orders: { $addToSet: '$orders._id' },
                    total_spent: { $sum: '$orders.total_amount' },
                    last_order_date: { $max: '$orders.order_date' }
                }
            },
            {
                $project: {
                    _id: 0,
                    customer_id: 1,
                    user_name: 1,
                    email: 1,
                    total_orders: { $size: '$total_orders' },
                    total_spent: 1,
                    last_order_date: 1
                }
            },
            { $sort: { last_order_date: -1 } }
        ]);

        const formattedCustomers = customers.map((customer, index) => ({
            customer_id: `C${String(index + 1).padStart(3, '0')}`,
            user_id: customer.customer_id,
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
            const product = await Product.create({
                vendor_id: vendorId,
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status
            });

            const variants = variantSizes.map((size, i) => {
                const regularPrice = parseFloat(variantRegularPrices[i]);
                const salePrice = variantSalePrices[i] ? parseFloat(variantSalePrices[i]) : null;
                const stockQuantity = parseInt(variantStockQuantities[i]);

                if (isNaN(regularPrice) || regularPrice <= 0) {
                    throw new Error('Regular price must be a positive number');
                }
                if (isNaN(stockQuantity) || stockQuantity < 0) {
                    throw new Error('Stock quantity must be a non-negative number');
                }
                if (salePrice && salePrice >= regularPrice) {
                    throw new Error('Sale price must be less than regular price');
                }

                return {
                    product_id: product._id,
                    size: size ? size.trim() : null,
                    color: variantColors[i] ? variantColors[i].trim() : null,
                    regular_price: regularPrice,
                    sale_price: salePrice,
                    stock_quantity: stockQuantity
                };
            });

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
            res.status(500).json({ success: false, message: error.message || 'Server error' });
        }
    }
];

module.exports = { storeSignup, serviceProviderLogin, getVendorDashboard, logout, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct };