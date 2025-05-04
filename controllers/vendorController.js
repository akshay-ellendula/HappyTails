const bcrypt = require('bcryptjs');
const { Vendor, Order, OrderItem, Product, ProductVariant, ProductImage, User, EventManager } = require('../models/database');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/products/'); // Ensure this directory exists
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});
const upload = multer({ storage: storage });

// Fetch vendor orders
const getVendorOrders = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const statusFilter = req.query.status || 'all'; // Default to 'all' if no status is provided

    try {
        // Fetch orders for the vendor
        let matchStage = {
            'products.vendor_id': parseInt(vendorId)
        };

        if (statusFilter !== 'all') {
            matchStage['orders.status'] = statusFilter;
        }

        const orders = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: 'id',
                    as: 'products'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
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
                    id: '$id',
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
            status: statusFilter // Pass the status filter to the template
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
        // Fetch products for the vendor along with their primary image
        const products = await Product.aggregate([
            {
                $match: { vendor_id: parseInt(vendorId) }
            },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: 'id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            {
                $lookup: {
                    from: 'productimages',
                    localField: 'id',
                    foreignField: 'product_id',
                    as: 'images'
                }
            },
            {
                $project: {
                    id: '$id',
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

        // Calculate sold quantity for each product
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
                image_path: product.image_path?.image_path || '/images/default.jpg' // Fallback image if no image is found
            };
        }));

        // Render the products page with the vendor's data
        res.render('shop-products', {
            vendor: req.session.vendor,
            products: productsWithSold
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
        // Fetch vendor details from the database
        const vendorDetails = await Vendor.findOne({ id: parseInt(vendorId) });
        if (!vendorDetails) {
            return res.status(404).send('Vendor not found');
        }

        // Calculate total revenue
        const totalRevenueResult = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: 'id',
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
                    foreignField: 'id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $match: { 'product.vendor_id': parseInt(vendorId) }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$price', '$quantity'] } }
                }
            }
        ]);
        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

        // Calculate products sold
        const productsSoldResult = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: 'id',
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
                    foreignField: 'id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $match: { 'product.vendor_id': parseInt(vendorId) }
            },
            {
                $group: {
                    _id: null,
                    productsSold: { $sum: '$quantity' }
                }
            }
        ]);
        const productsSold = productsSoldResult[0]?.productsSold || 0;

        // Calculate new orders
        const newOrdersResult = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: 'id',
                    as: 'products'
                }
            },
            {
                $match: {
                    'products.vendor_id': parseInt(vendorId),
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

        // Fetch recent orders
        const recentOrders = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: 'id',
                    as: 'products'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $match: { 'products.vendor_id': parseInt(vendorId) }
            },
            {
                $unwind: '$user'
            },
            {
                $unwind: '$order_items'
            },
            {
                $project: {
                    id: '$id',
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

        // Render the profile page with the vendor's data
        res.render('shop-profile', {
            vendor: {
                store_name: vendorDetails.store_name,
                owner_name: vendorDetails.name,
                email: vendorDetails.email,
                phone: vendorDetails.contact_number,
                address: vendorDetails.store_location,
                description: 'Happy Tails specializes in high-quality, eco-friendly pet accessories for cats and dogs. All our products are designed with pet comfort and safety in mind, using sustainable materials whenever possible.' // You can add a description field to the vendors table if needed
            },
            totalRevenue: totalRevenue.toFixed(2),
            productsSold,
            newOrders,
            recentOrders,
            customerRatings: '4.8/5' // Hardcoded for now; you can add a ratings system later
        });
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).send('Server error');
    }
};

const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;
    console.log('Login attempt:', { email, role }); // Debug: Log input

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
            id: user.id, 
            email: user.email, 
            role, 
            store_name: user.store_name || null
        };
        console.log('Session set:', req.session[sessionKey]); // Debug: Log session

        if (role === 'store-manager') {
            const storeNameSlug = user.store_name.toLowerCase().replace(/\s+/g, '-');
            redirect = `/shop-dashboard/${storeNameSlug}`;
        } else if (role === 'event-manager') {
            redirect = '/eventmanager_dashboard';
        }

        console.log('Redirecting to:', redirect); // Debug: Log redirect
        res.status(200).json({ success: true, message: 'Login successful', redirect });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// vendorController.js (getVendorDashboard)
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
        // Calculate total revenue
        const totalRevenueResult = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: 'id',
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
                    foreignField: 'id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $match: { 'product.vendor_id': parseInt(vendorId) }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ['$price', '$quantity'] } }
                }
            }
        ]);
        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

        // Calculate products sold
        const productsSoldResult = await OrderItem.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: 'id',
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
                    foreignField: 'id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $match: { 'product.vendor_id': parseInt(vendorId) }
            },
            {
                $group: {
                    _id: null,
                    productsSold: { $sum: '$quantity' }
                }
            }
        ]);
        const productsSold = productsSoldResult[0]?.productsSold || 0;

        // Calculate new orders
        const newOrdersResult = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: 'id',
                    as: 'products'
                }
            },
            {
                $match: {
                    'products.vendor_id': parseInt(vendorId),
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

        // Fetch recent orders
        const recentOrders = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: 'id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: 'id',
                    as: 'products'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            {
                $match: { 'products.vendor_id': parseInt(vendorId) }
            },
            {
                $unwind: '$user'
            },
            {
                $unwind: '$order_items'
            },
            {
                $project: {
                    id: '$id',
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
        res.status(500).send('Server error');
    }
};

// vendorController.js
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
        // Check if email already exists
        const existingVendor = await Vendor.findOne({ email });
        if (existingVendor) return res.status(400).json({ success: false, message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        // Create the new vendor
        const newVendor = await Vendor.create({
            name,
            contact_number: contactnumber,
            email,
            password: hashedPassword,
            store_name: storename,
            store_location: storelocation,
            created_at: new Date()
        });

        // Set the session for the new vendor
        req.session.vendor = {
            id: newVendor.id,
            email: newVendor.email,
            store_name: newVendor.store_name
        };

        // Generate the storeName slug for the redirect URL
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

// Fetch product data for editing
const getProductForEdit = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const productId = parseInt(req.params.productId);

    try {
        // Fetch product details
        const product = await Product.findOne({ id: productId, vendor_id: parseInt(vendorId) });
        if (!product) {
            return res.redirect('/shop-products?error=Product not found or you do not have permission to edit it.');
        }

        // Fetch all variants for the product
        const variants = await ProductVariant.find({ product_id: productId });

        // Fetch product images
        const images = await ProductImage.find({ product_id: productId });

        // Render the edit product page with the product data
        res.render('shop-product-edit', {
            vendor: req.session.vendor,
            product: {
                id: product.id,
                product_name: product.product_name,
                product_category: product.product_category,
                product_type: product.product_type,
                product_description: product.product_description,
                stock_status: product.stock_status,
                variants: variants || [], // Pass all variants
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
    upload.array('productImages', 4), // Allow up to 4 images
    async (req, res) => {
        if (!req.session.vendor) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const vendorId = req.session.vendor.id;
        const productId = parseInt(req.params.productId);
        const {
            productName,
            productCategory,
            productType,
            productDescription,
            stock_status, // Add stock_status
            'variant_size[]': variantSizes,
            'variant_color[]': variantColors,
            'variant_regular_price[]': variantRegularPrices,
            'variant_sale_price[]': variantSalePrices,
            'variant_stock_quantity[]': variantStockQuantities
        } = req.body;

        // Validate required fields
        if (!productName || !productCategory || !productType || !productDescription || !stock_status) {
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        if (!variantSizes || !variantRegularPrices || !variantStockQuantities) {
            return res.status(400).json({ success: false, message: 'At least one variant with size, regular price, and stock quantity is required' });
        }

        // Validate stock_status
        if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        try {
            // Verify the product belongs to the vendor
            const product = await Product.findOne({ id: productId, vendor_id: parseInt(vendorId) });
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found or you do not have permission to edit it.' });
            }

            // Update product details
            await Product.updateOne(
                { id: productId },
                {
                    product_name: productName,
                    product_category: productCategory,
                    product_type: productType,
                    product_description: productDescription,
                    stock_status: stock_status
                }
            );

            // Delete existing variants
            await ProductVariant.deleteMany({ product_id: productId });

            // Insert updated variants
            for (let i = 0; i < variantSizes.length; i++) {
                const size = variantSizes[i] || null;
                const color = variantColors[i] || null;
                const regularPrice = parseFloat(variantRegularPrices[i]);
                const salePrice = variantSalePrices[i] ? parseFloat(variantSalePrices[i]) : null;
                const stockQuantity = parseInt(variantStockQuantities[i]);

                if (!regularPrice || !stockQuantity) {
                    return res.status(400).json({ success: false, message: 'Regular price and stock quantity are required for each variant' });
                }

                // Validate sale price is less than regular price
                if (salePrice && salePrice >= regularPrice) {
                    return res.status(400).json({ success: false, message: 'Sale price must be less than regular price for all variants' });
                }

                await ProductVariant.create({
                    product_id: productId,
                    size,
                    color,
                    regular_price: regularPrice,
                    sale_price: salePrice,
                    stock_quantity: stockQuantity
                });
            }

            // Handle image uploads
            if (req.files && req.files.length > 0) {
                // Delete existing images
                await ProductImage.deleteMany({ product_id: productId });

                // Insert new images
                const images = req.files.map((file, index) => ({
                    product_id: productId,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: index === 0 ? true : false
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
        // Query to fetch customers who have placed orders with the vendor
        const customers = await User.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: 'id',
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
                    localField: 'orders.id',
                    foreignField: 'order_id',
                    as: 'order_items'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'order_items.product_id',
                    foreignField: 'id',
                    as: 'products'
                }
            },
            {
                $match: { 'products.vendor_id': parseInt(vendorId) }
            },
            {
                $group: {
                    _id: {
                        id: '$id',
                        user_name: '$user_name',
                        user_email: '$user_email'
                    },
                    total_orders: { $addToSet: '$orders.id' },
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

        // Format the customer data for the template
        const formattedCustomers = customers.map((customer, index) => ({
            customer_id: `C${String(index + 1).padStart(3, '0')}`, // Generate a customer ID like C001, C002, etc.
            user_id: customer.customer_id, // Actual user ID for linking to details
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
            'variant_size[]': variantSizes, // Array of sizes
            'variant_color[]': variantColors, // Array of colors
            'variant_regular_price[]': variantRegularPrices, // Array of regular prices
            'variant_sale_price[]': variantSalePrices, // Array of sale prices
            'variant_stock_quantity[]': variantStockQuantities // Array of stock quantities
        } = req.body;

        // Validate required fields
        if (!product_name || !product_category || !product_type || !product_description || !stock_status) {
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        if (!variantSizes || !variantRegularPrices || !variantStockQuantities || variantSizes.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one variant with size, regular price, and stock quantity is required' });
        }

        // Validate stock_status
        if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        try {
            // Get the highest product ID to generate the next one
            const lastProduct = await Product.findOne().sort({ id: -1 });
            const productId = lastProduct ? lastProduct.id + 1 : 1;

            // Insert the product
            await Product.create({
                id: productId,
                vendor_id: parseInt(vendorId),
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status,
                created_at: new Date()
            });

            // Insert all variants
            for (let i = 0; i < variantSizes.length; i++) {
                const size = variantSizes[i] ? variantSizes[i].trim() : null;
                const color = variantColors[i] ? variantColors[i].trim() : null;
                const regularPrice = parseFloat(variantRegularPrices[i]);
                const salePrice = variantSalePrices[i] ? parseFloat(variantSalePrices[i]) : null;
                const stockQuantity = parseInt(variantStockQuantities[i]);

                // Validate variant data
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
                    product_id: productId,
                    size,
                    color,
                    regular_price: regularPrice,
                    sale_price: salePrice,
                    stock_quantity: stockQuantity
                });
            }

            // Insert images
            if (req.files && req.files.length > 0) {
                const images = req.files.map((file, index) => ({
                    product_id: productId,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: index === 0 ? true : false
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

// Export all controllers, including submitProduct
module.exports = { storeSignup, serviceProviderLogin, getVendorDashboard, logout, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct };