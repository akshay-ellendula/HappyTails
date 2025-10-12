const bcrypt = require('bcryptjs');
const { Vendor, Order, OrderItem, Product, ProductVariant, ProductImage, User, EventManager } = require('../models/database');
const mongoose = require('mongoose');
const path = require('path');

const multer = require('multer');

// store files in memory instead of disk
const storage = multer.memoryStorage();
const upload = multer({ storage });


// Fetch vendor orders
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
            // Handle 'Confirmed' filter by querying for 'Pending' status in DB
            if (statusFilter === 'Confirmed') {
                matchStage['status'] = 'Pending';
            } else {
                matchStage['status'] = statusFilter;
            }
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
                // Map 'Pending' status from DB to 'Confirmed' for display
                status: order.status === 'Pending' ? 'Confirmed' : order.status
            })),
            status: statusFilter
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Server error');
    }
};
// Fetch vendor products
// Fetch vendor products (updated to fetch primary image_data correctly)
const getVendorProducts = async (req, res) => {
    if (!req.session.vendor) {
        console.log('No vendor session in getVendorProducts, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const vendorId = vendor.id;
    const { category, sort } = req.query;

    // --- FILTER AND SORT LOGIC ---
    const matchStage = {
        vendor_id: new mongoose.Types.ObjectId(vendorId),
        is_deleted: { $ne: true }
    };
    if (category && category !== 'All Categories') {
        matchStage.product_category = category;
    }

    const sortStage = {};
    if (sort === 'oldest') {
        sortStage.created_at = 1;
    } else if (sort === 'price_asc') {
        sortStage.price_for_sort = 1;
    } else if (sort === 'price_desc') {
        sortStage.price_for_sort = -1;
    } else {
        sortStage.created_at = -1; // Default to newest
    }
    // -----------------------------
    console.log('Fetching products for vendor:', { vendorId });

    try {
        const products = await Product.aggregate([
            { $match: matchStage },
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
                $addFields: {
                    primary_image: {
                        $ifNull: [
                            {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: '$images',
                                            as: 'img',
                                            cond: { $eq: ['$$img.is_primary', true] }
                                        }
                                    },
                                    0
                                ]
                            },
                            {
                                $arrayElemAt: ['$images', 0]
                            }
                        ]
                    }
                }
            },
            {
                $addFields: {
                    price_for_sort: { $ifNull: [{ $arrayElemAt: ['$variants.regular_price', 0] }, 0] }
                }
            },
            { $sort: sortStage },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'order_items'
                }
            },
           {
                $addFields: {
                    total_stock: { $sum: '$variants.stock_quantity' }
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
                    stock_quantity: '$total_stock', // Use the new total stock
                    image_data: { $ifNull: ['$primary_image.image_data', '/images/default.jpg'] },
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
const getVendorProfile = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;

    try {
        const vendorDetails = await Vendor.findById(vendorId);
        if (!vendorDetails) {
            return res.status(404).send('Vendor not found');
        }

        // Map database fields to shop-profile.ejs fields
        const vendorProfile = {
            store_name: vendorDetails.store_name,
            owner_name: vendorDetails.name, // Map name to owner_name
            email: vendorDetails.email,
            phone: vendorDetails.contact_number, // Map contact_number to phone
            address: vendorDetails.store_location, // Map store_location to address
            description: vendorDetails.description || '' // Include description
        };

        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = currentMonthStart;

        const getStatsForPeriod = async (startDate, endDate) => {
            const revenueResult = await Order.aggregate([
                { $match: { status: { $in: ['Pending', 'Shipped', 'Delivered'] } } },
                { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'items' } },
                { $unwind: '$items' },
                { $lookup: { from: 'products', localField: 'items.product_id', foreignField: '_id', as: 'products' } },
                { $unwind: '$products' },
                { 
                    $match: { 
                        'products.vendor_id': new mongoose.Types.ObjectId(vendorId),
                        order_date: { $gte: startDate, $lt: endDate }
                    }
                },
                { 
                    $group: { 
                        _id: null, 
                        total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                }
            ]);

            const salesResult = await OrderItem.aggregate([
                { $lookup: { from: 'orders', localField: 'order_id', foreignField: '_id', as: 'order' } },
                { $unwind: '$order' },
                { $match: { 'order.status': { $in: ['Pending', 'Shipped', 'Delivered'] } } },
                { $lookup: { from: 'products', localField: 'product_id', foreignField: '_id', as: 'product' } },
                { $unwind: '$product' },
                { 
                    $match: { 
                        'product.vendor_id': new mongoose.Types.ObjectId(vendorId),
                        'order.order_date': { $gte: startDate, $lt: endDate }
                    }
                },
                { 
                    $group: { 
                        _id: null, 
                        count: { $sum: '$quantity' }
                    }
                }
            ]);

            return {
                revenue: revenueResult[0]?.total || 0,
                productsSold: salesResult[0]?.count || 0
            };
        };

        const currentMonthStats = await getStatsForPeriod(currentMonthStart, now);
        const lastMonthStats = await getStatsForPeriod(lastMonthStart, lastMonthEnd);

        const calculatePercentageChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const revenueChange = calculatePercentageChange(currentMonthStats.revenue, lastMonthStats.revenue);
        const productsSoldChange = calculatePercentageChange(currentMonthStats.productsSold, lastMonthStats.productsSold);

        const totalRevenue = await Order.aggregate([
            { $match: { status: { $in: ['Pending', 'Shipped', 'Delivered'] } } },
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'items' } },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product_id', foreignField: '_id', as: 'products' } },
            { $unwind: '$products' },
            { 
                $match: { 
                    'products.vendor_id': new mongoose.Types.ObjectId(vendorId)
                }
            },
            { 
                $group: { 
                    _id: null, 
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            }
        ]);

        const productsSold = await OrderItem.aggregate([
            { $lookup: { from: 'orders', localField: 'order_id', foreignField: '_id', as: 'order' } },
            { $unwind: '$order' },
            { $match: { 'order.status': { $in: ['Pending', 'Shipped', 'Delivered'] } } },
            { $lookup: { from: 'products', localField: 'product_id', foreignField: '_id', as: 'product' } },
            { $unwind: '$product' },
            { 
                $match: { 
                    'product.vendor_id': new mongoose.Types.ObjectId(vendorId)
                }
            },
            { 
                $group: { 
                    _id: null, 
                    productsSold: { $sum: '$quantity' }
                }
            }
        ]);

        const newOrders = await Order.aggregate([
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'items' } },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product_id', foreignField: '_id', as: 'products' } },
            { $unwind: '$products' },
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
            }
        ]);

        const recentOrders = await Order.aggregate([
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'order_items' } },
            { $unwind: '$order_items' },
            { $lookup: { from: 'products', localField: 'order_items.product_id', foreignField: '_id', as: 'products' } },
            { $unwind: '$products' },
            { 
                $match: { 
                    'products.vendor_id': new mongoose.Types.ObjectId(vendorId)
                }
            },
            { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { 
                $project: { 
                    id: '$_id', 
                    order_date: 1, 
                    status: 1, 
                    total_amount: { $multiply: ['$order_items.price', '$order_items.quantity'] }, 
                    user_name: '$user.user_name', 
                    product_name: '$order_items.product_name', 
                    _id: 0 
                }
            },
            { $sort: { order_date: -1 } },
            { $limit: 4 }
        ]);

        res.render('shop-profile', {
            vendor: vendorProfile, // Use mapped fields
            totalRevenue: ((totalRevenue[0]?.totalRevenue || 0) * 0.94).toFixed(2),
            productsSold: productsSold[0]?.productsSold || 0,
            newOrders: newOrders[0]?.newOrders || 0,
            recentOrders,
            revenueChange,
            productsSoldChange
        });
    } catch (error) {
        console.error('Error fetching vendor profile:', error);
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

const getVendorDashboard = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;

    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = currentMonthStart;

        const totalRevenue = await Order.aggregate([
            { $match: { status: { $in: ['Pending', 'Shipped', 'Delivered'] } } }, // Include only non-cancelled orders
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'items' } },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product_id', foreignField: '_id', as: 'products' } },
            { $unwind: '$products' },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } }
        ]);

        const productsSold = await OrderItem.aggregate([
            { $lookup: { from: 'orders', localField: 'order_id', foreignField: '_id', as: 'order' } },
            { $unwind: '$order' },
            { $match: { 'order.status': { $in: ['Pending', 'Shipped', 'Delivered'] } } }, // Include only non-cancelled orders
            { $lookup: { from: 'products', localField: 'product_id', foreignField: '_id', as: 'product' } },
            { $unwind: '$product' },
            { $match: { 'product.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, productsSold: { $sum: '$quantity' } } }
        ]);

        const newOrders = await Order.aggregate([
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'items' } },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product_id', foreignField: '_id', as: 'products' } },
            { $unwind: '$products' },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId), status: 'Pending' } },
            { $group: { _id: null, newOrders: { $sum: 1 } } }
        ]);

        const recentOrders = await Order.aggregate([
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'order_items' } },
            { $unwind: '$order_items' },
            { $lookup: { from: 'products', localField: 'order_items.product_id', foreignField: '_id', as: 'products' } },
            { $unwind: '$products' },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { 
                $project: { 
                    id: '$_id', 
                    order_date: 1, 
                    status: 1, 
                    total_amount: { $multiply: ['$order_items.price', '$order_items.quantity'] }, 
                    user_name: '$user.user_name', 
                    product_name: '$order_items.product_name', 
                    _id: 0 
                }
            },
            { $sort: { order_date: -1 } },
            { $limit: 4 }
        ]);

        const currentMonthStats = await Order.aggregate([
            { $match: { status: { $in: ['Pending', 'Shipped', 'Delivered'] }, order_date: { $gte: currentMonthStart, $lte: now } } },
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'items' } },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product_id', foreignField: '_id', as: 'products' } },
            { $unwind: '$products' },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } }
        ]);

        const lastMonthStats = await Order.aggregate([
            { $match: { status: { $in: ['Pending', 'Shipped', 'Delivered'] }, order_date: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'items' } },
            { $unwind: '$items' },
            { $lookup: { from: 'products', localField: 'items.product_id', foreignField: '_id', as: 'products' } },
            { $unwind: '$products' },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } }
        ]);

        const calculatePercentageChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const revenueChange = calculatePercentageChange(currentMonthStats[0]?.total || 0, lastMonthStats[0]?.total || 0);
        const productsSoldChange = calculatePercentageChange(productsSold[0]?.productsSold || 0, lastMonthStats[0]?.productsSold || 0);

        res.render('shop-dashboard', {
            vendor: req.session.vendor,
            totalRevenue: ((totalRevenue[0]?.totalRevenue || 0) * 0.94).toFixed(2), // Apply 6% fee deduction
            productsSold: productsSold[0]?.productsSold || 0,
            newOrders: newOrders[0]?.newOrders || 0,
            recentOrders,
            revenueChange,
            productsSoldChange
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

    // Validate required fields
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
        // Check if vendor already exists
        const existingVendor = await Vendor.findOne({ $or: [{ email }, { store_name: storename }] });
        if (existingVendor) {
            console.log('Email or store name already registered:', email, storename);
            return res.status(400).json({ success: false, message: 'Email or store name already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new vendor with mapped fields
        const newVendor = await Vendor.create({
            store_name: storename,
            name: name, // Maps to owner_name in shop-profile.ejs
            email: email,
            contact_number: contactnumber, // Maps to phone in shop-profile.ejs
            store_location: storelocation, // Maps to address in shop-profile.ejs
            password: hashedPassword,
            description: '' // Default empty description as per shop-profile.ejs
        });

        // Set session with all required fields for shop-profile.ejs
        req.session.vendor = {
            id: newVendor._id.toString(),
            store_name: newVendor.store_name,
            name: newVendor.name, // Maps to owner_name
            email: newVendor.email,
            contact_number: newVendor.contact_number, // Maps to phone
            store_location: newVendor.store_location, // Maps to address
            role: 'store-manager'
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

            const deletedImages = req.body.deletedImages || [];
            if (deletedImages.length > 0) {
                await ProductImage.deleteMany({ 
                    product_id: productId 
                });
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
                    image_data: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
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
// Submit new product
const submitProduct = [
    upload.array('product_images', 4),
    async (req, res) => {
        if (!req.session.vendor) {
            console.log('Unauthorized: No vendor session found');
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

        console.log('Received product data:', {
            vendorId,
            product_name,
            product_category,
            product_type,
            stock_status,
            variants: JSON.stringify(variants),
            files: req.files ? req.files.map(f => f.originalname) : 'No files'
        });

        // Validate required fields
        if (!product_name || !product_category || !product_type || !product_description || !stock_status) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        // Validate variants
        if (!variants || Object.keys(variants).length === 0) {
            console.log('Validation failed: No variants provided');
            return res.status(400).json({ success: false, message: 'At least one variant is required' });
        }

        const variantArray = Object.keys(variants).map(index => ({
            size: variants[index].size || null,
            color: variants[index].color || null,
            regular_price: parseFloat(variants[index].regular_price),
            sale_price: variants[index].sale_price ? parseFloat(variants[index].sale_price) : null,
            stock_quantity: parseInt(variants[index].stock_quantity)
        }));

        // Validate each variant
        for (const variant of variantArray) {
            if (!variant.size || isNaN(variant.regular_price) || isNaN(variant.stock_quantity)) {
                console.log('Validation failed for variant:', variant);
                return res.status(400).json({ success: false, message: 'Size, regular price, and stock quantity are required for all variants' });
            }
            if (variant.regular_price <= 0) {
                console.log('Validation failed: Regular price must be positive');
                return res.status(400).json({ success: false, message: 'Regular price must be positive' });
            }
            if (variant.stock_quantity < 0) {
                console.log('Validation failed: Stock quantity must be non-negative');
                return res.status(400).json({ success: false, message: 'Stock quantity must be non-negative' });
            }
            if (variant.sale_price && variant.sale_price >= variant.regular_price) {
                console.log('Validation failed: Sale price must be less than regular price');
                return res.status(400).json({ success: false, message: 'Sale price must be less than regular price' });
            }
        }

        // Validate stock status
        if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
            console.log('Validation failed: Invalid stock status:', stock_status);
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        try {
            // Save product
            const newProduct = new Product({
                vendor_id: new mongoose.Types.ObjectId(vendorId),
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status
            });

            const savedProduct = await newProduct.save();
            console.log('Product saved:', savedProduct._id);

            // Save variants
            const variantDocs = variantArray.map(variant => ({
                ...variant,
                product_id: savedProduct._id
            }));

            await ProductVariant.insertMany(variantDocs);
            console.log('Variants saved:', variantDocs.length);

            // Save images
            if (req.files && req.files.length > 0) {
                const images = req.files.map((file, index) => ({
                    product_id: savedProduct._id,
                    image_data: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
                    is_primary: index === 0
                }));
                await ProductImage.insertMany(images);
                console.log('Images saved:', images.length);
            } else {
                console.log('No images provided');
            }

            res.status(200).json({
                success: true,
                message: 'Product added successfully',
                redirect: '/shop-products'
            });
        } catch (error) {
            console.error('Error adding product:', error.stack);
            res.status(500).json({ success: false, message: `Server error: ${error.message}` });
        }
    }
];

const getOrderDetails = async (req, res) => {
    if (!req.session.vendor) {
        console.log('No vendor session in getOrderDetails, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const orderId = req.params.orderId;
    console.log('Fetching order details:', { vendorId, orderId });

    try {
        const order = await Order.findById(orderId).populate('user_id');
        if (!order) {
            console.log('Order not found:', { orderId });
            return res.render('shop-order-details', {
                vendor: req.session.vendor,
                order: null,
            });
        }

        const orderItems = await OrderItem.find({ order_id: orderId }).populate('product_id variant_id');

        const productMatch = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'order_items' } },
            { $lookup: { from: 'products', localField: 'order_items.product_id', foreignField: '_id', as: 'products' } },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } }
        ]);

        if (!productMatch.length) {
            console.log('Order does not belong to this vendor:', { orderId, vendorId });
            return res.status(403).send('Unauthorized: This order does not belong to your store.');
        }

        const dbStatus = order.status || 'Pending';
        const displayStatus = dbStatus === 'Pending' ? 'Confirmed' : dbStatus;

        const timeline = [];
        if (order.order_date) {
            timeline.push({
                status: 'Confirmed',
                date: order.order_date,
                description: 'Order was placed and confirmed.',
            });
        }
        if (order.shipped_at) {
            timeline.push({
                status: 'Shipped',
                date: order.shipped_at,
                description: 'Your order has been shipped.',
            });
        }
        if (order.delivered_at) {
            timeline.push({
                status: 'Delivered',
                date: order.delivered_at,
                description: 'Your order has been delivered.',
            });
        }
        if (order.cancelled_at) {
            timeline.push({
                status: 'Cancelled',
                date: order.cancelled_at,
                description: 'The order was cancelled.',
            });
        }
        timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

        const orderData = {
            order_id: `#ORD-${order._id.toString()}`,
            status: displayStatus,
            order_date: order.order_date || new Date(),
            payment_method: `Credit Card (**** ${order.payment_last_four || 'XXXX'})`,
            payment_status: 'Paid',
            customer: {
                name: order.user_id ? order.user_id.user_name : 'Unknown',
                email: order.user_id ? order.user_id.user_email : 'N/A',
                phone: order.user_id ? order.user_id.user_phone || 'N/A' : 'N/A',
            },
            shipping: {
                address: order.user_id ? order.user_id.user_address || 'N/A' : 'N/A',
                method: 'Standard Shipping',
                tracking_number: null,
                estimated_delivery: order.delivery_date || null,
                shipping_cost: 0,
            },
            items: orderItems.map(item => ({
                product_name: item.product_name,
                price: item.price,
                quantity: item.quantity,
            })),
            subtotal: order.subtotal,
            platform_charge: order.subtotal * 0.04,
            shipping_cost: 0,
            tax: 0,
            total: order.total_amount,
            timeline: timeline,
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
                status: order.status === 'Pending' ? 'Confirmed' : order.status
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
        // Find the order without checking its status
        const order = await Order.findOne({ _id: orderId });
        if (!order) {
            // Updated error message
            return res.status(404).json({ success: false, message: 'Order not found' });
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
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const period = req.query.period || 'all';

    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

        const dateFilter = period === 'today' ? { order_date: { $gte: todayStart } } :
                          period === 'week' ? { order_date: { $gte: weekStart } } :
                          period === 'month' ? { order_date: { $gte: monthStart } } : {};

        const calculateChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const createOrderPipeline = (filter) => [
            { $match: { ...filter } },
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'order_items' } },
            { $unwind: '$order_items' },
            { $lookup: { from: 'products', localField: 'order_items.product_id', foreignField: '_id', as: 'products' } },
            { $unwind: '$products' },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } }
        ];

        const getStats = async (filter = {}) => {
            const pipeline = createOrderPipeline({ ...filter, status: { $in: ['Pending', 'Shipped', 'Delivered'] } }); // Include only non-cancelled orders
            const result = await Order.aggregate([
                ...pipeline,
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } }, // Sum price * quantity
                        orderCount: { $sum: 1 },
                        customers: { $addToSet: '$user_id' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        revenue: 1,
                        orderCount: 1,
                        customerCount: { $size: '$customers' }
                    }
                }
            ]);
            const stats = result[0] || { revenue: 0, orderCount: 0, customerCount: 0 };
            stats.avgOrderValue = stats.orderCount > 0 ? stats.revenue / stats.orderCount : 0;
            return stats;
        };

        const [
            totalStats, todayStats, weekStats, monthStats,
            yesterdayStats, lastWeekStats, lastMonthStats
        ] = await Promise.all([
            getStats(), getStats({ order_date: { $gte: todayStart } }), getStats({ order_date: { $gte: weekStart } }), getStats({ order_date: { $gte: monthStart } }),
            getStats({ order_date: { $gte: yesterdayStart, $lt: todayStart } }),
            getStats({ order_date: { $gte: lastWeekStart, $lt: weekStart } }),
            getStats({ order_date: { $gte: lastMonthStart, $lt: lastMonthEnd } })
        ]);

        const revenueByCategory = await Order.aggregate([
            ...createOrderPipeline({ ...dateFilter, status: { $in: ['Pending', 'Shipped', 'Delivered'] } }), // Include only non-cancelled orders
            { 
                $group: { 
                    _id: '$products.product_category', 
                    revenue: { $sum: { $multiply: ['$order_items.price', '$order_items.quantity'] } } 
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        const orderStatus = await Order.aggregate([
            ...createOrderPipeline(dateFilter), // Include all statuses for breakdown
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const productStats = await Product.aggregate([
            { $match: { vendor_id: new mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$stock_status', 'In Stock'] }, 1, 0] } },
                    outOfStock: { $sum: { $cond: [{ $eq: ['$stock_status', 'Out of Stock'] }, 1, 0] } }
                }
            }
        ]);

        let currentPeriodStats = totalStats;
        if (period === 'today') currentPeriodStats = todayStats;
        if (period === 'week') currentPeriodStats = weekStats;
        if (period === 'month') currentPeriodStats = monthStats;

        const analyticsData = {
            revenue: {
                total: (totalStats.revenue * 0.94).toFixed(2), // Apply 6% fee deduction
                today: (todayStats.revenue * 0.94).toFixed(2),
                week: (weekStats.revenue * 0.94).toFixed(2),
                month: (monthStats.revenue * 0.94).toFixed(2),
                todayChange: calculateChange(todayStats.revenue, yesterdayStats.revenue),
                weekChange: calculateChange(weekStats.revenue, lastWeekStats.revenue),
                monthChange: calculateChange(monthStats.revenue, lastMonthStats.revenue)
            },
            avgOrderValue: {
                total: totalStats.avgOrderValue.toFixed(2),
                today: todayStats.avgOrderValue.toFixed(2),
                week: weekStats.avgOrderValue.toFixed(2),
                month: monthStats.avgOrderValue.toFixed(2),
                todayChange: calculateChange(todayStats.avgOrderValue, yesterdayStats.avgOrderValue),
                weekChange: calculateChange(weekStats.avgOrderValue, lastWeekStats.avgOrderValue),
                monthChange: calculateChange(monthStats.avgOrderValue, lastMonthStats.avgOrderValue),
            },
            orders: {
                total: currentPeriodStats.orderCount,
                today: todayStats.orderCount,
                week: weekStats.orderCount,
                month: monthStats.orderCount,
                todayChange: calculateChange(todayStats.orderCount, yesterdayStats.orderCount),
                weekChange: calculateChange(weekStats.orderCount, lastWeekStats.orderCount),
                monthChange: calculateChange(monthStats.orderCount, lastMonthStats.orderCount),
                status: {
                    processing: orderStatus.find(s => s._id === 'Shipped')?.count || 0,
                    confirmed: orderStatus.find(s => s._id === 'Pending')?.count || 0,
                    delivered: orderStatus.find(s => s._id === 'Delivered')?.count || 0,
                    cancelled: orderStatus.find(s => s._id === 'Cancelled')?.count || 0,
                }
            },
            customers: {
                total: totalStats.customerCount,
                today: todayStats.customerCount,
                week: weekStats.customerCount,
                month: monthStats.customerCount,
                todayChange: calculateChange(todayStats.customerCount, yesterdayStats.customerCount),
                weekChange: calculateChange(weekStats.customerCount, lastWeekStats.customerCount),
                monthChange: calculateChange(monthStats.customerCount, lastMonthStats.customerCount),
            },
            revenueByCategory: revenueByCategory.map(cat => ({
                category: cat._id || 'Other',
                revenue: (cat.revenue * 0.94).toFixed(2), // Apply 6% fee deduction
                percentage: totalStats.revenue ? ((cat.revenue / totalStats.revenue) * 100).toFixed(0) : 0
            })),
            products: {
                total: productStats[0]?.total || 0,
                active: productStats[0]?.active || 0,
                outOfStock: productStats[0]?.outOfStock || 0,
            }
        };

        res.render('shop-analytics', {
            vendor: req.session.vendor,
            analytics: analyticsData,
            period: period
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

    // Validate email domain
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const emailDomain = email.split('@')[1];

    if (!email.includes('@') || !allowedDomains.includes(emailDomain)) {
        return res.status(400).json({ success: false, message: 'Please use an email from a valid provider (e.g., Gmail, Yahoo, Outlook).' });
    }

    // Validate required fields
    if (!storeName || !ownerName || !phone || !address) {
        return res.status(400).json({ success: false, message: 'All required fields must be provided' });
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
        // Check if email or store_name is already used by another vendor
        const existingVendor = await Vendor.findOne({ 
            $or: [{ email }, { store_name: storeName }],
            _id: { $ne: vendorId }
        });
        if (existingVendor) {
            return res.status(400).json({ success: false, message: 'Email or store name is already in use' });
        }

        // Update vendor document with mapped fields
        const updatedVendor = await Vendor.findByIdAndUpdate(
            vendorId,
            {
                store_name: storeName,
                name: ownerName, // Map to name
                email,
                contact_number: phone, // Map to contact_number
                store_location: address, // Map to store_location
                description // Include description
            },
            { new: true }
        );

        if (!updatedVendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        // Update session with all relevant fields
        req.session.vendor = {
            ...req.session.vendor,
            store_name: storeName,
            name: ownerName,
            email,
            contact_number: phone,
            store_location: address
        };

        console.log('Vendor profile updated:', updatedVendor);
        res.status(200).json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating vendor profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
const deleteProduct = async (req, res) => {
    if (!req.session.vendor) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const vendorId = req.session.vendor.id;
    const productId = req.params.productId;
    console.log('Attempting to delete product:', { vendorId, productId });

    try {
        // Check if the product exists and belongs to the vendor
        const product = await Product.findOne({ _id: productId, vendor_id: new mongoose.Types.ObjectId(vendorId) });
        if (!product) {
            console.log('Product not found or unauthorized:', { productId, vendorId });
            return res.status(404).json({ success: false, message: 'Product not found or you do not have permission to delete it.' });
        }

        // Delete the product, its variants, and images
        // Soft delete by flagging the product as deleted, which will hide it from the product list
        // while preserving it for historical order records.
        await Product.updateOne(
            { _id: productId },
            { $set: { is_deleted: true } }
        );
        await ProductVariant.deleteMany({ product_id: productId });
        await ProductImage.deleteMany({ product_id: productId });

        console.log('Product deleted successfully:', { productId });
        res.status(200).json({ success: true, message: 'Product deleted successfully', redirect: '/shop-products' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// New function to update order status
const updateOrderStatus = async (req, res) => {
    if (!req.session.vendor) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const vendorId = req.session.vendor.id;
    const { orderId } = req.params;
    const { status: newStatus } = req.body;

    console.log('Attempting to update order status:', { vendorId, orderId, newStatus });

    const validNextStatuses = ['Shipped', 'Delivered', 'Cancelled'];
    if (!validNextStatuses.includes(newStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid status update value.' });
    }

    try {
        const productMatch = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            { $lookup: { from: 'orderitems', localField: '_id', foreignField: 'order_id', as: 'order_items' } },
            { $lookup: { from: 'products', localField: 'order_items.product_id', foreignField: '_id', as: 'products' } },
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } }
        ]);

        if (productMatch.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized: This order does not belong to your store.' });
        }

        // Add logic to check for valid status transitions
        const order = productMatch[0];
        const currentStatus = order.status;

        if (currentStatus === 'Pending' && !['Shipped', 'Delivered', 'Cancelled'].includes(newStatus)) {
            return res.status(400).json({ success: false, message: `Cannot change status from Confirmed to ${newStatus}.` });
        }
        if (currentStatus === 'Shipped' && !['Delivered', 'Cancelled'].includes(newStatus)) {
            return res.status(400).json({ success: false, message: `Cannot change status from Shipped to ${newStatus}.` });
        }
        if (['Delivered', 'Cancelled'].includes(currentStatus)) {
             return res.status(400).json({ success: false, message: 'This order is already finalized and its status cannot be changed.' });
        }

        // Define the update payload
const updateData = { status: newStatus };

// Set the corresponding timestamp based on the new status
if (newStatus === 'Shipped') {
    updateData.shipped_at = new Date();
} else if (newStatus === 'Delivered') {
    updateData.delivered_at = new Date();
} else if (newStatus === 'Cancelled') {
    updateData.cancelled_at = new Date();
}

// Update the order in the database
await Order.updateOne({ _id: orderId }, { $set: updateData });

        res.status(200).json({ success: true, message: 'Order status updated successfully.' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { storeSignup, serviceProviderLogin, getVendorDashboard, logout,getVendorAnalytics, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct,getOrderDetails, getCustomerDetails,deleteSelectedOrders,deleteOrder,updateVendorProfile,deleteProduct,updateOrderStatus };