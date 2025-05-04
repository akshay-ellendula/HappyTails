const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Vendor, Order, OrderItem, Product, ProductVariant, ProductImage, User, EventManager } = require('../models/database');
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

    // Validate vendor_id
    if (!mongoose.Types.ObjectId.isValid(req.session.vendor.id)) {
        return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }
    const vendorId = new mongoose.Types.ObjectId(req.session.vendor.id);
    const statusFilter = req.query.status || 'all';

    try {
        let matchStage = { 'products.vendor_id': vendorId };
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
            {
                $match: matchStage
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    id: '$_id',
                    order_date: '$order_date',
                    status: '$status',
                    total_amount: '$total_amount',
                    user_name: '$user.user_name',
                    products: {
                        $map: {
                            input: '$order_items',
                            as: 'item',
                            in: '$$item.product_name'
                        }
                    }
                }
            },
            {
                $sort: { order_date: -1 }
            }
        ]);

        res.render('shop-orders', {
            vendor: req.session.vendor,
            orders: orders.map(order => ({
                id: order.id,
                order_id: `#ORD-${order.id}`,
                customer: order.user_name,
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
        res.status(500).send(`Server error: ${error.message}`);
    }
};

const getVendorProducts = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    // Validate vendor_id
    if (!mongoose.Types.ObjectId.isValid(req.session.vendor.id)) {
        return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }
    const vendorId = new mongoose.Types.ObjectId(req.session.vendor.id);

    try {
        const products = await Product.aggregate([
            {
                $match: { vendor_id: vendorId }
            },
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
                $project: {
                    id: '$_id',
                    product_name: '$product_name',
                    product_category: '$product_category',
                    product_type: '$product_type',
                    sale_price: { $arrayElemAt: ['$variants.sale_price', 0] },
                    stock_quantity: { $arrayElemAt: ['$variants.stock_quantity', 0] },
                    image_path: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$images',
                                    as: 'image',
                                    cond: { $eq: ['$$image.is_primary', true] }
                                }
                            },
                            0
                        ]
                    }
                }
            }
        ]);

        const productsWithSold = await Promise.all(products.map(async (product) => {
            const soldResult = await OrderItem.aggregate([
                {
                    $match: { product_id: product.id }
                },
                {
                    $group: {
                        _id: null,
                        sold: { $sum: '$quantity' }
                    }
                }
            ]);

            return {
                ...product,
                sold: soldResult[0]?.sold || 0,
                image_path: product.image_path?.image_path || '/images/default.jpg'
            };
        }));

        res.render('shop-products', {
            vendor: req.session.vendor,
            products: productsWithSold
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send(`Server error: ${error.message}`);
    }
};

const getVendorProfile = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    // Validate vendor_id
    if (!mongoose.Types.ObjectId.isValid(req.session.vendor.id)) {
        return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }
    const vendorId = new mongoose.Types.ObjectId(req.session.vendor.id);

    try {
        const vendorDetails = await Vendor.findById(vendorId);
        if (!vendorDetails) {
            return res.status(404).send('Vendor not found');
        }

        const totalRevenueResult = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            {
                $unwind: '$order'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $match: { 'product.vendor_id': vendorId }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$price', '$quantity'] } }
                }
            }
        ]);
        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

        const productsSoldResult = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            {
                $unwind: '$order'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $match: { 'product.vendor_id': vendorId }
            },
            {
                $group: {
                    _id: null,
                    productsSold: { $sum: '$quantity' }
                }
            }
        ]);
        const productsSold = productsSoldResult[0]?.productsSold || 0;

        const newOrdersResult = await Order.aggregate([
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
                    'products.vendor_id': vendorId,
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
        const newOrders = newOrdersResult[0]?.newOrders || 0;

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
            {
                $match: { 'products.vendor_id': vendorId }
            },
            {
                $unwind: '$user'
            },
            {
                $unwind: '$order_items'
            },
            {
                $project: {
                    id: '$_id',
                    order_date: '$order_date',
                    status: '$status',
                    total_amount: '$total_amount',
                    user_name: '$user.user_name',
                    product_name: '$order_items.product_name'
                }
            },
            {
                $sort: { order_date: -1 }
            },
            {
                $limit: 4
            }
        ]);

        res.render('shop-profile', {
            vendor: {
                store_name: vendorDetails.store_name,
                owner_name: vendorDetails.name,
                email: vendorDetails.email,
                phone: vendorDetails.contact_number,
                address: vendorDetails.store_location,
                description: 'Happy Tails specializes in high-quality, eco-friendly pet accessories for cats and dogs.'
            },
            totalRevenue: totalRevenue.toFixed(2),
            productsSold,
            newOrders,
            recentOrders,
            customerRatings: '4.8/5'
        });
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).send(`Server error: ${error.message}`);
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
            id: user._id, 
            email: user.email, 
            role, 
            store_name: user.store_name || null,
            name: user.name,
            contact_number: user.contact_number || null,
            store_location: user.store_location || null,
            company_name: user.company_name || null,
            location: user.location || null
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
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
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

    // Validate vendor_id
    if (!mongoose.Types.ObjectId.isValid(vendor.id)) {
        return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }
    const vendorId = new mongoose.Types.ObjectId(vendor.id);

    try {
        const totalRevenueResult = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            {
                $unwind: '$order'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $match: { 'product.vendor_id': vendorId }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$price', '$quantity'] } }
                }
            }
        ]);
        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

        const productsSoldResult = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            {
                $unwind: '$order'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $match: { 'product.vendor_id': vendorId }
            },
            {
                $group: {
                    _id: null,
                    productsSold: { $sum: '$quantity' }
                }
            }
        ]);
        const productsSold = productsSoldResult[0]?.productsSold || 0;

        const newOrdersResult = await Order.aggregate([
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
                    'products.vendor_id': vendorId,
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
        const newOrders = newOrdersResult[0]?.newOrders || 0;

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
            {
                $match: { 'products.vendor_id': vendorId }
            },
            {
                $unwind: '$user'
            },
            {
                $unwind: '$order_items'
            },
            {
                $project: {
                    id: '$_id',
                    order_date: '$order_date',
                    status: '$status',
                    total_amount: '$total_amount',
                    user_name: '$user.user_name',
                    product_name: '$order_items.product_name'
                }
            },
            {
                $sort: { order_date: -1 }
            },
            {
                $limit: 4
            }
        ]);

        res.render('shop-dashboard', {
            vendor: req.session.vendor,
            totalRevenue: totalRevenue.toFixed(2),
            productsSold,
            newOrders,
            recentOrders
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send(`Server error: ${error.message}`);
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
        if (existingVendor) return res.status(400).json({ success: false, message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newVendor = await Vendor.create({
            name,
            contact_number: contactnumber,
            email,
            password: hashedPassword,
            store_name: storename,
            store_location: storelocation,
            created_at: new Date()
        });

        req.session.vendor = {
            id: newVendor._id,
            email: newVendor.email,
            store_name: newVendor.store_name,
            name: newVendor.name,
            contact_number: newVendor.contact_number,
            store_location: newVendor.store_location
        };

        const storeNameSlug = newVendor.store_name.toLowerCase().replace(/\s+/g, '-');
        const redirectUrl = `/shop-dashboard/${storeNameSlug}`;

        res.status(201).json({
            success: true,
            redirect: redirectUrl,
            message: 'Vendor signup successful'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.status(200).json({ success: true, redirect: '/service_provider_login', message: 'Logout successful' });
    });
};

const getProductForEdit = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    // Validate vendor_id
    if (!mongoose.Types.ObjectId.isValid(req.session.vendor.id)) {
        return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }
    const vendorId = new mongoose.Types.ObjectId(req.session.vendor.id);

    const productId = req.params.productId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.redirect('/shop-products?error=Invalid product ID');
    }
    const productObjectId = new mongoose.Types.ObjectId(productId);

    try {
        const product = await Product.findOne({ _id: productObjectId, vendor_id: vendorId });
        if (!product) {
            return res.redirect('/shop-products?error=Product not found or you do not have permission to edit it.');
        }

        const variants = await ProductVariant.find({ product_id: productObjectId });
        const images = await ProductImage.find({ product_id: productObjectId });

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
        res.redirect(`/shop-products?error=Server error while fetching product data: ${error.message}`);
    }
};

const updateProduct = [
    upload.array('productImages', 4),
    async (req, res) => {
        if (!req.session.vendor) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Validate vendor_id
        if (!mongoose.Types.ObjectId.isValid(req.session.vendor.id)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
        }
        const vendorId = new mongoose.Types.ObjectId(req.session.vendor.id);

        const productId = req.params.productId;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }
        const productObjectId = new mongoose.Types.ObjectId(productId);

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
            const product = await Product.findOne({ _id: productObjectId, vendor_id: vendorId });
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found or you do not have permission to edit it.' });
            }

            await Product.updateOne(
                { _id: productObjectId },
                {
                    product_name: productName,
                    product_category: productCategory,
                    product_type: productType,
                    product_description: productDescription,
                    stock_status: stock_status
                }
            );

            await ProductVariant.deleteMany({ product_id: productObjectId });

            for (let i = 0; i < variantSizes.length; i++) {
                const size = variantSizes[i] || null;
                const color = variantColors[i] || null;
                const regularPrice = parseFloat(variantRegularPrices[i]);
                const salePrice = variantSalePrices[i] ? parseFloat(variantSalePrices[i]) : null;
                const stockQuantity = parseInt(variantStockQuantities[i]);

                if (!regularPrice || !stockQuantity) {
                    return res.status(400).json({ success: false, message: 'Regular price and stock quantity are required for each variant' });
                }

                if (salePrice && salePrice >= regularPrice) {
                    return res.status(400).json({ success: false, message: 'Sale price must be less than regular price for all variants' });
                }

                await ProductVariant.create({
                    product_id: productObjectId,
                    size,
                    color,
                    regular_price: regularPrice,
                    sale_price: salePrice,
                    stock_quantity: stockQuantity
                });
            }

            if (req.files && req.files.length > 0) {
                await ProductImage.deleteMany({ product_id: productObjectId });

                const images = req.files.map((file, index) => ({
                    product_id: productObjectId,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: index === 0 ? true : false
                }));
                await ProductImage.insertMany(images);
            }

            res.status(200).json({ success: true, message: 'Product updated successfully', redirect: '/shop-products' });
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({ success: false, message: `Server error: ${error.message}` });
        }
    }
];

const getVendorCustomers = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    // Validate vendor_id
    if (!mongoose.Types.ObjectId.isValid(req.session.vendor.id)) {
        return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }
    const vendorId = new mongoose.Types.ObjectId(req.session.vendor.id);

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
                $unwind: '$orders'
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
            {
                $match: { 'products.vendor_id': vendorId }
            },
            {
                $group: {
                    _id: {
                        id: '$_id',
                        user_name: '$user_name',
                        user_email: '$user_email'
                    },
                    total_orders: { $addToSet: '$orders._id' },
                    total_spent: { $sum: '$orders.total_amount' },
                    last_order_date: { $max: '$orders.order_date' }
                }
            },
            {
                $project: {
                    customer_id: '$_id.id',
                    user_name: '$_id.user_name',
                    email: '$_id.user_email',
                    total_orders: { $size: '$total_orders' },
                    total_spent: '$total_spent',
                    last_order_date: '$last_order_date'
                }
            },
            {
                $sort: { last_order_date: -1 }
            }
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
        res.status(500).send(`Server error: ${error.message}`);
    }
};

const submitProduct = [
    upload.array('product_images', 4),
    async (req, res) => {
        if (!req.session.vendor) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Validate vendor_id
        if (!mongoose.Types.ObjectId.isValid(req.session.vendor.id)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
        }
        const vendorId = new mongoose.Types.ObjectId(req.session.vendor.id);

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
                stock_status,
                created_at: new Date()
            });

            for (let i = 0; i < variantSizes.length; i++) {
                const size = variantSizes[i] ? variantSizes[i].trim() : null;
                const color = variantColors[i] ? variantColors[i].trim() : null;
                const regularPrice = parseFloat(variantRegularPrices[i]);
                const salePrice = variantSalePrices[i] ? parseFloat(variantSalePrices[i]) : null;
                const stockQuantity = parseInt(variantStockQuantities[i]);

                if (isNaN(regularPrice) || regularPrice <= 0) {
                    return res.status(400).json({ success: false, message: 'Regular price must be a positive number' });
                }
                if (isNaN(stockQuantity) || stockQuantity < 0) {
                    return res.status(400).json({ success: false, message: 'Stock quantity must be a non-negative number' });
                }
                if (salePrice && salePrice >= regularPrice) {
                    return res.status(400).json({ success: false, message: 'Sale price must be less than regular price' });
                }

                await ProductVariant.create({
                    product_id: product._id,
                    size,
                    color,
                    regular_price: regularPrice,
                    sale_price: salePrice,
                    stock_quantity: stockQuantity
                });
            }

            if (req.files && req.files.length > 0) {
                const images = req.files.map((file, index) => ({
                    product_id: product._id,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: index === 0 ? true : false
                }));
                await ProductImage.insertMany(images);
            }

            res.status(200).json({ success: true, message: 'Product added successfully', redirect: '/shop-products' });
        } catch (error) {
            console.error('Error adding product:', error);
            res.status(500).json({ success: false, message: `Server error: ${error.message}` });
        }
    }
];

module.exports = { storeSignup, serviceProviderLogin, getVendorDashboard, logout, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct };