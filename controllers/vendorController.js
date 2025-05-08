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

        console.log('Product data fetched:', { productName: product.product_name, variants: variants.length, images: images.length });

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
            console.log('No vendor session in updateProduct');
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

        console.log('Updating product:', { productId, vendorId, productName });

        if (!productName || !productCategory || !productType || !productDescription || !stock_status) {
            console.log('Missing product fields');
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        if (!variantSizes || !variantRegularPrices || !variantStockQuantities) {
            console.log('Missing variant fields');
            return res.status(400).json({ success: false, message: 'At least one variant with size, regular price, and stock quantity is required' });
        }

        if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
            console.log('Invalid stock status:', stock_status);
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        try {
            const product = await Product.findOne({ _id: productId, vendor_id: new mongoose.Types.ObjectId(vendorId) });
            if (!product) {
                console.log('Product not found or unauthorized:', { productId, vendorId });
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

            console.log('Product updated successfully:', { productId });
            res.status(200).json({ success: true, message: 'Product updated successfully', redirect: '/shop-products' });
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({ success: false, message: error.message || 'Server error' });
        }
    }
];

// Fetch vendor customers
const getVendorCustomers = async (req, res) => {
    if (!req.session.vendor) {
        console.log('No vendor session in getVendorCustomers, redirecting to login');
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    console.log('Fetching customers for vendor:', { vendorId });

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
            { $match: { 'products.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: '$_id',
                    customer_id: { $first: '$_id' },
                    user_name: { $first: '$user_name' },
                    email: { $first: '$user_email' },
                    total_orders: { $addToSet: '$orders._id' },
                    total_spent: {
                        $sum: {
                            $sum: {
                                $map: {
                                    input: '$order_items',
                                    as: 'item',
                                    in: { $multiply: ['$$item.price', '$$item.quantity'] }
                                }
                            }
                        }
                    },
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

        console.log('Customers fetched:', customers.length);
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

    try {
        const customer = await User.findById(userId);
        if (!customer) {
            return res.status(404).send('Customer not found');
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


module.exports = { storeSignup, serviceProviderLogin, getVendorDashboard, logout,getVendorAnalytics, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct,getOrderDetails, getCustomerDetails,deleteSelectedOrders,deleteOrder };