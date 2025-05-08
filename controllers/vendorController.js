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
        console.log('No vendor session in getVendorOrders, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const statusFilter = req.query.status || 'all';
    console.log('Fetching orders for vendor:', { vendorId, statusFilter });

    try {
        let matchStage = { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) };
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

        console.log('Orders fetched:', orders.length);
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

// Fetch vendor products
const getVendorProducts = async (req, res) => {
    if (!req.session.vendor) {
        console.log('No vendor session in getVendorProducts, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const vendorId = vendor.id;
    console.log('Fetching products for vendor:', { vendorId });

    try {
        const products = await Product.aggregate([
            { $match: { vendor_id: new mongoose.Types.ObjectId(vendorId) } },
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
                    regular_price: { $ifNull: [{ $arrayElemAt: ['$variants.regular_price', 0] }, 0] },
                    stock_quantity: { $arrayElemAt: ['$variants.stock_quantity', 0] },
                    image_path: { $ifNull: ['$images.image_path', '/images/default.jpg'] },
                    sold: { $sum: '$order_items.quantity' },
                    _id: 0
                }
            }
        ]);

        console.log('Products fetched:', products.length);
        res.render('shop-products', {
            vendor: req.session.vendor,
            products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Server error');
    }
};

// Fetch vendor profile
const getVendorProfile = async (req, res) => {
    if (!req.session.vendor) {
        console.log('No vendor session in getVendorProfile, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const vendorId = vendor.id;
    console.log('Fetching profile for vendor:', { vendorId });

    try {
        const vendorDetails = await Vendor.findById(vendorId);
        if (!vendorDetails) {
            console.error('Vendor not found:', vendorId);
            return res.status(404).send('Vendor not found');
        }

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
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
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
            { $match: { 'product.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
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
                    'products.vendor_id': new mongoose.Types.ObjectId(vendorId),
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
                    'products.vendor_id': new mongoose.Types.ObjectId(vendorId)
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

        console.log('Profile data fetched:', {
            totalRevenue: totalRevenue[0]?.totalRevenue,
            productsSold: productsSold[0]?.productsSold,
            newOrders: newOrders[0]?.newOrders,
            recentOrders: recentOrders.length
        });

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
        console.log('Missing fields:', { email, password, role });
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
            console.log('Invalid role:', role);
            return res.status(400).json({ success: false, message: 'Invalid role. Use "store-manager" or "event-manager"' });
        }

        const user = await Model.findOne({ email });
        if (!user) {
            console.log('User not found:', { email, role });
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        console.log('User found:', { email, role, store_name: user.store_name });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch:', { email, role });
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
            if (!user.store_name) {
                console.error('Vendor missing store_name:', user.email);
                return res.status(500).json({ success: false, message: 'Vendor profile incomplete. Contact support.' });
            }
            const storeNameSlug = user.store_name.toLowerCase().replace(/\s+/g, '-');
            redirect = `/shop-dashboard/${storeNameSlug}`;
        } else if (role === 'event-manager') {
            redirect = '/eventmanager_dashboard';
        }

        console.log('Redirecting to:', redirect);
        res.status(200).json({ success: true, message: 'Login successful', redirect });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get vendor dashboard
const getVendorDashboard = async (req, res) => {
    console.log('Accessing dashboard:', { storeName: req.params.storeName, session: req.session.vendor });
    if (!req.session.vendor) {
        console.log('No vendor session, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const storeNameSlug = req.params.storeName;

    const expectedStoreNameSlug = vendor.store_name.toLowerCase().replace(/\s+/g, '-');
    console.log('Store name comparison:', { storeNameSlug, expectedStoreNameSlug });
    if (storeNameSlug !== expectedStoreNameSlug) {
        console.log('Store name mismatch, rejecting request');
        return res.status(403).send('Unauthorized: You can only access your own dashboard.');
    }

    const vendorId = vendor.id;
    console.log('Fetching dashboard data for vendor:', { vendorId });

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
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
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
            { $match: { 'product.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
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
                    'products.vendor_id': new mongoose.Types.ObjectId(vendorId),
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
                    'products.vendor_id': new mongoose.Types.ObjectId(vendorId)
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

        console.log('Dashboard data fetched:', {
            totalRevenue: totalRevenue[0]?.totalRevenue,
            productsSold: productsSold[0]?.productsSold,
            newOrders: newOrders[0]?.newOrders,
            recentOrders: recentOrders.length
        });

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
    const { name, contactnumber, email, password, confirmpassword, storename, storelocation } = req.body;

    console.log('Store signup attempt:', { email, storename });

    if (!name || !contactnumber || !email || !password || !storename || !storelocation) {
        console.log('Missing signup fields:', { name, contactnumber, email, password, storename, storelocation });
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
            console.log('Email already registered:', email);
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
            role: 'store-manager',
            store_name: newVendor.store_name
        };
        console.log('Signup session set:', req.session.vendor);

        const storeNameSlug = newVendor.store_name.toLowerCase().replace(/\s+/g, '-');
        const redirectUrl = `/shop-dashboard/${storeNameSlug}`;

        console.log('Signup redirecting to:', redirectUrl);
        res.status(201).json({
            success: true,
            redirect: redirectUrl,
            message: 'Vendor signup successful'
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Logout
const logout = (req, res) => {
    console.log('Logging out vendor:', req.session.vendor?.email);
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Server error');
        }
        res.redirect('/service_provider_login');
    });
};

// Get product for editing
const getProductForEdit = async (req, res) => {
    if (!req.session.vendor) {
        console.log('No vendor session in getProductForEdit, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const productId = req.params.productId;
    console.log('Fetching product for edit:', { vendorId, productId });

    try {
        const product = await Product.findOne({ _id: productId, vendor_id: new mongoose.Types.ObjectId(vendorId) });
        if (!product) {
            console.log('Product not found or unauthorized:', { productId, vendorId });
            return res.redirect('/shop-products?error=Product not found or you do not have permission to edit it.');
        }

        const variants = await ProductVariant.find({ product_id: productId });
        const images = await ProductImage.find({ product_id: productId });

        console.log('Product data fetched:', {
            productName: product.product_name,
            variants: variants.length,
            images: images.length,
            variantDetails: variants.map(v => ({
                size: v.size,
                color: v.color,
                regular_price: v.regular_price,
                sale_price: v.sale_price,
                stock_quantity: v.stock_quantity
            }))
        });

        const firstVariant = variants[0] || {};
        res.render('shop-product-edit', {
            vendor: req.session.vendor,
            product: {
                id: product._id,
                product_name: product.product_name || '',
                product_category: product.product_category || '',
                product_type: product.product_type || '',
                product_description: product.product_description || '',
                short_description: product.short_description || '',
                stock_status: product.stock_status || 'In Stock',
                size: firstVariant.size || '',
                color: firstVariant.color || '',
                regular_price: firstVariant.regular_price || 0.01,
                sale_price: firstVariant.sale_price || '',
                stock_quantity: firstVariant.stock_quantity || 0,
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
            shortDescription,
            stockStatus,
            variant_size,
            variant_color,
            variant_regular_price,
            variant_sale_price,
            variant_stock_quantity
        } = req.body;

        console.log('Received form data:', {
            productName,
            productCategory,
            productType,
            productDescription,
            shortDescription,
            stockStatus,
            variant_size,
            variant_color,
            variant_regular_price,
            variant_sale_price,
            variant_stock_quantity
        });

        if (!productName || !productCategory || !productType || !productDescription || !shortDescription || !stockStatus) {
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        if (!variant_regular_price || !variant_stock_quantity) {
            return res.status(400).json({ success: false, message: 'Regular price and stock quantity are required' });
        }

        if (!['In Stock', 'Out of Stock'].includes(stockStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        try {
            const product = await Product.findOne({ _id: productId, vendor_id: new mongoose.Types.ObjectId(vendorId) });
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
                    short_description: shortDescription,
                    stock_status: stockStatus
                }
            );

            await ProductVariant.deleteMany({ product_id: productId });

            const regularPrice = parseFloat(variant_regular_price);
            const salePrice = variant_sale_price ? parseFloat(variant_sale_price) : null;
            const stockQuantity = parseInt(variant_stock_quantity);

            if (isNaN(regularPrice) || regularPrice <= 0) {
                return res.status(400).json({ success: false, message: 'Regular price must be greater than 0' });
            }
            if (isNaN(stockQuantity) || stockQuantity < 0) {
                return res.status(400).json({ success: false, message: 'Stock quantity must be 0 or greater' });
            }
            if (salePrice && salePrice >= regularPrice) {
                return res.status(400).json({ success: false, message: 'Sale price must be less than regular price' });
            }

            await ProductVariant.create({
                product_id: productId,
                size: variant_size || null,
                color: variant_color || null,
                regular_price: regularPrice,
                sale_price: salePrice,
                stock_quantity: stockQuantity
            });

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

const getVendorCustomers = async (req, res) => {
    if (!req.session.vendor) {
        console.log('No vendor session, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    console.log('Fetching customers for vendor:', { vendorId });

    try {
        const customers = await Order.aggregate([
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
                    'products.vendor_id': new mongoose.Types.ObjectId(vendorId)
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
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $group: {
                    _id: '$user._id',
                    customer_id: { $first: '$user._id' },
                    name: { $first: '$user.user_name' },
                    email: { $first: '$user.user_email' },
                    orders: {
                        $push: {
                            order_id: '$_id',
                            order_date: '$order_date',
                            total_amount: '$total_amount',
                            status: '$status'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    customer_id: 1,
                    name: 1,
                    email: 1,
                    total_orders: { $size: '$orders' },
                    total_spent: { $sum: '$orders.total_amount' },
                    last_order: { $max: '$orders.order_date' }
                }
            },
            { $sort: { total_spent: -1 } }
        ]);

        console.log('Customers fetched:', {
            vendorId,
            count: customers.length
        });

        res.render('shop-customers', {
            vendor: req.session.vendor,
            customers: customers.map(customer => ({
                ...customer,
                customer_id: customer.customer_id.toString(), // Full ObjectId as string
                display_id: `C${customer.customer_id.toString().slice(-3)}`, // For display
                last_order: customer.last_order ? new Date(customer.last_order).toLocaleDateString() : 'N/A',
                total_spent: (customer.total_spent || 0).toFixed(2)
            }))
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.redirect('/shop-products?error=Server error while fetching customer data.');
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
            variants
        } = req.body;

        if (!product_name || !product_category || !product_type || !product_description || !stock_status) {
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        if (!variants || Object.keys(variants).length === 0) {
            return res.status(400).json({ success: false, message: 'At least one variant is required' });
        }

        const variantArray = Object.keys(variants).map(index => ({
            size: variants[index].size || null,
            color: variants[index].color || null,
            regular_price: parseFloat(variants[index].regular_price),
            sale_price: variants[index].sale_price ? parseFloat(variants[index].sale_price) : null,
            stock_quantity: parseInt(variants[index].stock_quantity)
        }));

        for (const variant of variantArray) {
            if (!variant.size || isNaN(variant.regular_price) || isNaN(variant.stock_quantity)) {
                return res.status(400).json({ success: false, message: 'Size, regular price, and stock quantity are required for all variants' });
            }
            if (variant.regular_price <= 0) {
                return res.status(400).json({ success: false, message: 'Regular price must be positive' });
            }
            if (variant.stock_quantity < 0) {
                return res.status(400).json({ success: false, message: 'Stock quantity must be non-negative' });
            }
            if (variant.sale_price && variant.sale_price >= variant.regular_price) {
                return res.status(400).json({ success: false, message: 'Sale price must be less than regular price' });
            }
        }

        if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        try {
            // Save product
            const newProduct = new Product({
                vendor_id: vendorId,
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status
            });

            const savedProduct = await newProduct.save();

            // Save variants
            const variantDocs = variantArray.map(variant => ({
                ...variant,
                product_id: savedProduct._id
            }));

            await ProductVariant.insertMany(variantDocs);

            // Save images
            if (req.files && req.files.length > 0) {
                const imageDocs = req.files.map((file, index) => ({
                    product_id: savedProduct._id,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: index === 0
                }));

                await ProductImage.insertMany(imageDocs);
            }

            res.status(200).json({ success: true, message: 'Product added successfully', redirect: '/shop-products' });

        } catch (error) {
            console.error('Error adding product:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
];

// Fetch order details for a specific order
const getOrderDetails = async (req, res) => {
    if (!req.session.vendor) {
        console.log('No vendor session in getOrderDetails, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const orderId = req.params.orderId;
    console.log('Fetching order details:', { vendorId, orderId });

    try {
        // Fetch the order and populate user_id for customer details
        const order = await Order.findById(orderId).populate('user_id');
        if (!order) {
            console.log('Order not found:', { orderId });
            return res.render('shop-order-details', {
                vendor: req.session.vendor,
                order: null,
            });
        }

        // Fetch order items
        const orderItems = await OrderItem.find({ order_id: orderId }).populate('product_id variant_id');

        // Verify that the order contains products from this vendor
        const productMatch = await Order.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(orderId) }
            },
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
                $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) }
            }
        ]);

        if (!productMatch.length) {
            console.log('Order does not belong to this vendor:', { orderId, vendorId });
            return res.status(403).send('Unauthorized: This order does not belong to your store.');
        }

        // Construct the order object for the EJS page
        const orderData = {
            order_id: `#ORD-${order._id.toString()}`, // Match format used in getVendorOrders
            status: order.status || 'Pending',
            order_date: order.order_date || new Date(),
            payment_method: 'Credit Card (****4242)', // Placeholder since not in schema
            payment_status: 'Paid', // Placeholder since not in schema
            customer: {
                name: order.user_id ? order.user_id.user_name : 'Unknown',
                email: order.user_id ? order.user_id.user_email : 'N/A',
                phone: order.user_id ? order.user_id.user_phone || 'N/A' : 'N/A',
            },
            shipping: {
                address: order.user_id ? order.user_id.user_address || 'N/A' : 'N/A', // Use user's address as fallback
                method: 'Standard Shipping', // Placeholder since not in schema
                tracking_number: null, // Not in schema
                estimated_delivery: order.delivery_date || null,
                shipping_cost: 0, // Not in schema, default to 0
            },
            items: orderItems.map(item => ({
                product_name: item.product_name,
                sku: item.product_id ? item.product_id.sku || 'N/A' : 'N/A',
                price: item.price,
                quantity: item.quantity,
            })),
            subtotal: order.subtotal,
            shipping_cost: 0, // Not in schema, default to 0
            tax: 0, // Not in schema, default to 0
            total: order.total_amount,
            timeline: [ // Placeholder timeline since not in schema
                {
                    status: order.status,
                    date: order.order_date,
                    description: `Order ${order.status.toLowerCase()}`,
                },
                {
                    status: 'Placed',
                    date: order.order_date,
                    description: 'Order placed',
                },
            ],
        };

        console.log('Order details fetched:', { orderId });
        res.render('shop-order-details', {
            vendor: req.session.vendor,
            order: orderData,
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Server error');
    }
};

const getCustomerDetails = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const userId = req.query.customer;
console.log('Received userId for customer details:', userId);
if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log('Invalid ObjectId:', userId);
    return res.status(404).render('shop-customer-details', {
        vendor: req.session.vendor,
        customer: {
            id: userId,
            name: 'Invalid Customer ID',
            email: 'N/A',
            phone: 'N/A',
            address: 'N/A',
            joined: 'N/A'
        },
        summary: {
            totalOrders: 0,
            totalRevenue: '0.00',
            avgOrderValue: '0.00',
            lastPurchase: 'N/A',
            mostPurchased: 'N/A',
            returnRate: '0%'
        },
        orders: []
    });
}

    console.log('Fetching customer details:', { vendorId, userId });
    

    try {
        console.log('Querying User collection for _id:', userId);
const customer = await User.findById(userId);
console.log('Customer found:', customer ? customer : 'No customer found');
        if (!customer) {
            console.log('Customer not found:', { userId });
            return res.status(404).render('shop-customer-details', {
                vendor: req.session.vendor,
                customer: {
                    id: 'N/A',
                    name: 'Unknown Customer',
                    email: 'N/A',
                    phone: 'N/A',
                    address: 'N/A',
                    joined: 'N/A'
                },
                summary: {
                    totalOrders: 0,
                    totalRevenue: '0.00',
                    avgOrderValue: '0.00',
                    lastPurchase: 'N/A',
                    mostPurchased: 'N/A',
                    returnRate: '0%'
                },
                orders: []
            });
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
                $match: {
                    'products.vendor_id': new mongoose.Types.ObjectId(vendorId),
                    user_id: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $project: {
                    order_id: '$_id',
                    order_date: 1,
                    status: 1,
                    total_amount: 1,
                    items: '$order_items',
                    _id: 0
                }
            },
            { $sort: { order_date: -1 } }
        ]);

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
        const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';
        const mostPurchased = await OrderItem.aggregate([
            { $match: { order_id: { $in: orders.map(o => o.order_id) } } },
            { $group: { _id: '$product_name', count: { $sum: '$quantity' } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        console.log('Customer details fetched:', {
            customerId: userId,
            totalOrders,
            totalRevenue
        });

        res.render('shop-customer-details', {
            vendor: req.session.vendor,
            customer: {
                id: `C${userId.slice(-3).padStart(3, '0')}`,
                name: customer.user_name,
                email: customer.user_email,
                phone: customer.user_phone || 'N/A',
                address: customer.user_address || 'N/A',
                joined: customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-US') : 'N/A'
            },
            summary: {
                totalOrders,
                totalRevenue: totalRevenue.toFixed(2),
                avgOrderValue,
                lastPurchase: orders[0]?.order_date ? new Date(orders[0].order_date).toLocaleDateString('en-US') : 'N/A',
                mostPurchased: mostPurchased[0]?.count > 0 ? mostPurchased[0]._id : 'N/A',
                returnRate: '0%' // Placeholder, update if return data exists
            },
            orders: orders.map(order => ({
                order_id: `#ORD-${order.order_id}`,
                date: new Date(order.order_date).toLocaleDateString('en-US'),
                items: order.items.map(item => `${item.product_name} (${item.quantity})`).join(', '),
                total: order.total_amount.toFixed(2),
                status: order.status
            }))
        });
    } catch (error) {
        console.error('Error fetching customer details:', error);
        res.status(500).send('Server error');
    }
};

// Delete a single order
const deleteOrder = async (req, res) => {
    if (!req.session.vendor) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const vendorId = req.session.vendor.id;
    const orderId = req.params.orderId;
    try {
        const order = await Order.findOne({ _id: orderId, status: 'Pending' });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found or not pending' });
        }
        const productMatch = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'order_items' } },
            { $lookup: { from: 'products', localField: 'order_items.product_id', foreignField: '_id', as: 'products' } },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } }
        ]);
        if (!productMatch.length) {
            return res.status(403).json({ success: false, message: 'Unauthorized: This order does not belong to your store' });
        }
        await Order.deleteOne({ _id: orderId });
        await OrderItem.deleteMany({ order_id: orderId });
        res.status(200).json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete selected orders
const deleteSelectedOrders = async (req, res) => {
    if (!req.session.vendor) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const vendorId = req.session.vendor.id;
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No orders selected' });
    }
    try {
        const orders = await Order.find({ _id: { $in: orderIds }, status: 'Pending' });
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'No pending orders found' });
        }
        const productMatch = await Order.aggregate([
            { $match: { _id: { $in: orderIds.map(id => new mongoose.Types.ObjectId(id)) } } },
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'order_items' } },
            { $lookup: { from: 'products', localField: 'order_items.product_id', foreignField: '_id', as: 'products' } },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } }
        ]);
        if (productMatch.length !== orders.length) {
            return res.status(403).json({ success: false, message: 'Unauthorized: Some orders do not belong to your store' });
        }
        await Order.deleteMany({ _id: { $in: orderIds } });
        await OrderItem.deleteMany({ order_id: { $in: orderIds } });
        res.status(200).json({ success: true, message: 'Selected orders deleted successfully' });
    } catch (error) {
        console.error('Error deleting selected orders:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorAnalytics = async (req, res) => {
    if (!req.session.vendor) {
        console.log('No vendor session in getVendorAnalytics, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const period = req.query.period || 'all';
    console.log('Fetching analytics for vendor:', { vendorId, period });

    try {
        // Define time filters
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const timeFilters = {
            all: {},
            today: { $gte: todayStart },
            week: { $gte: weekStart },
            month: { $gte: monthStart }
        };

        const orderDateFilter = timeFilters[period] || {};

        // Revenue Calculations
        const revenuePipeline = [
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
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            ...(Object.keys(orderDateFilter).length ? [{ $match: { order_date: orderDateFilter } }] : []),
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
        ];

        const [totalRevenueResult, todayRevenue, weekRevenue, monthRevenue] = await Promise.all([
            Order.aggregate(revenuePipeline),
            Order.aggregate([...revenuePipeline, { $match: { order_date: { $gte: todayStart } } }]),
            Order.aggregate([...revenuePipeline, { $match: { order_date: { $gte: weekStart } } }]),
            Order.aggregate([...revenuePipeline, { $match: { order_date: { $gte: monthStart } } }])
        ]);

        // Revenue by Product Category
        const revenueByCategory = await Order.aggregate([
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
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            ...(Object.keys(orderDateFilter).length ? [{ $match: { order_date: orderDateFilter } }] : []),
            { $unwind: '$order_items' },
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.product_category',
                    revenue: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        // Order Calculations
        const orderPipeline = [
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
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            ...(Object.keys(orderDateFilter).length ? [{ $match: { order_date: orderDateFilter } }] : []),
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalOrders: { $ifNull: ['$totalOrders', 0] }
                }
            }
        ];

        const [totalOrdersResult, todayOrders, weekOrders, monthOrders] = await Promise.all([
            Order.aggregate(orderPipeline),
            Order.aggregate([...orderPipeline, { $match: { order_date: { $gte: todayStart } } }]),
            Order.aggregate([...orderPipeline, { $match: { order_date: { $gte: weekStart } } }]),
            Order.aggregate([...orderPipeline, { $match: { order_date: { $gte: monthStart } } }])
        ]);

        // Order Status
        const orderStatus = await Order.aggregate([
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
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Customer Calculations
        const customerPipeline = [
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
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: null,
                    totalCustomers: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalCustomers: { $ifNull: ['$totalCustomers', 0] }
                }
            }
        ];

        const [totalCustomersResult, todayCustomers, weekCustomers, monthCustomers] = await Promise.all([
            User.aggregate(customerPipeline),
            User.aggregate([...customerPipeline, { $match: { created_at: { $gte: todayStart } } }]),
            User.aggregate([...customerPipeline, { $match: { created_at: { $gte: weekStart } } }]),
            User.aggregate([...customerPipeline, { $match: { created_at: { $gte: monthStart } } }])
        ]);

        // Product Calculations
        const productStats = await Product.aggregate([
            { $match: { vendor_id: new mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    activeProducts: { $sum: { $cond: [{ $eq: ['$stock_status', 'In Stock'] }, 1, 0] } },
                    outOfStock: { $sum: { $cond: [{ $eq: ['$stock_status', 'Out of Stock'] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalProducts: 1,
                    activeProducts: 1,
                    outOfStock: 1
                }
            }
        ]);

        // Average Order Value
        const avgOrderValuePipeline = [
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
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            ...(Object.keys(orderDateFilter).length ? [{ $match: { order_date: orderDateFilter } }] : []),
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$total_amount' },
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    avgOrderValue: { $cond: [{ $gt: ['$totalOrders', 0] }, { $divide: ['$totalAmount', '$totalOrders'] }, 0] }
                }
            }
        ];

        const [avgOrderValueResult, todayAvgOrder, weekAvgOrder, monthAvgOrder] = await Promise.all([
            Order.aggregate(avgOrderValuePipeline),
            Order.aggregate([...avgOrderValuePipeline, { $match: { order_date: { $gte: todayStart } } }]),
            Order.aggregate([...avgOrderValuePipeline, { $match: { order_date: { $gte: weekStart } } }]),
            Order.aggregate([...avgOrderValuePipeline, { $match: { order_date: { $gte: monthStart } } }])
        ]);

        // Format data for EJS
        const analyticsData = {
            revenue: {
                total: (totalRevenueResult[0]?.totalRevenue || 0).toFixed(2),
                today: (todayRevenue[0]?.totalRevenue || 0).toFixed(2),
                week: (weekRevenue[0]?.totalRevenue || 0).toFixed(2),
                month: (monthRevenue[0]?.totalRevenue || 0).toFixed(2)
            },
            orders: {
                total: totalOrdersResult[0]?.totalOrders || 0,
                today: todayOrders[0]?.totalOrders || 0,
                week: weekOrders[0]?.totalOrders || 0,
                month: monthOrders[0]?.totalOrders || 0,
                status: {
                    completed: orderStatus.find(s => s._id === 'Completed')?.count || 0,
                    processing: orderStatus.find(s => s._id === 'Processing')?.count || 0,
                    pending: orderStatus.find(s => s._id === 'Pending')?.count || 0
                }
            },
            customers: {
                total: totalCustomersResult[0]?.totalCustomers || 0,
                today: todayCustomers[0]?.totalCustomers || 0,
                week: weekCustomers[0]?.totalCustomers || 0,
                month: monthCustomers[0]?.totalCustomers || 0
            },
            products: {
                total: productStats[0]?.totalProducts || 0,
                active: productStats[0]?.activeProducts || 0,
                outOfStock: productStats[0]?.outOfStock || 0
            },
            avgOrderValue: {
                total: (avgOrderValueResult[0]?.avgOrderValue || 0).toFixed(2),
                today: (todayAvgOrder[0]?.avgOrderValue || 0).toFixed(2),
                week: (weekAvgOrder[0]?.avgOrderValue || 0).toFixed(2),
                month: (monthAvgOrder[0]?.avgOrderValue || 0).toFixed(2)
            },
            revenueByCategory: revenueByCategory.map(cat => ({
                category: cat._id || 'Other',
                revenue: cat.revenue.toFixed(2),
                percentage: totalRevenueResult[0]?.totalRevenue ? ((cat.revenue / totalRevenueResult[0].totalRevenue) * 100).toFixed(0) : 0
            }))
        };

        console.log('Analytics data fetched:', analyticsData);

        res.render('shop-analytics', {
            vendor: req.session.vendor,
            analytics: analyticsData,
            period
        });
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).send('Server error');
    }
};

const updateVendorProfile = async (req, res) => {
    if (!req.session.vendor) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const vendorId = req.session.vendor.id;
    const { storeName, ownerName, email, phone, address, description } = req.body;

    console.log('Updating vendor profile:', { vendorId, storeName, ownerName, email, phone, address, description });

    // Basic validation
    if (!storeName || !ownerName || !email || !phone || !address) {
        return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Phone number must be 10 digits' });
    }
    if (storeName.length < 2) {
        return res.status(400).json({ success: false, message: 'Store name must be at least 2 characters' });
    }
    if (ownerName.length < 2) {
        return res.status(400).json({ success: false, message: 'Owner name must be at least 2 characters' });
    }
    if (address.length < 3) {
        return res.status(400).json({ success: false, message: 'Address must be at least 3 characters' });
    }

    try {
        // Check if email is already used by another vendor
        const existingVendor = await Vendor.findOne({ email, _id: { $ne: vendorId } });
        if (existingVendor) {
            return res.status(400).json({ success: false, message: 'Email is already in use' });
        }

        // Update vendor document
        const updatedVendor = await Vendor.findByIdAndUpdate(
            vendorId,
            {
                store_name: storeName,
                name: ownerName,
                email,
                contact_number: phone,
                store_location: address,
                // Description is not in the schema, so it's ignored unless schema is updated
            },
            { new: true }
        );

        if (!updatedVendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        // Update session
        req.session.vendor = {
            ...req.session.vendor,
            store_name: storeName,
            email,
        };

        console.log('Vendor profile updated:', updatedVendor);
        res.status(200).json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating vendor profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { storeSignup, serviceProviderLogin, getVendorDashboard, logout,getVendorAnalytics, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct,getOrderDetails, getCustomerDetails,deleteSelectedOrders,deleteOrder,updateVendorProfile };