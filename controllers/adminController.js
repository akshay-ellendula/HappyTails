const { User, Vendor, EventManager, Product, ProductVariant, ProductImage, Order, OrderItem, Event, EventAttendee } = require('../models/database');
const bcrypt = require('bcrypt');

const adminLogin = async (req, res) => {
    const { admin_email, admin_password } = req.body;
    const admin = { email: "admin@gmail.com", password: "admin123#" };
    if (admin_email === admin.email && admin_password === admin.password) {
        req.session.admin = { email: admin_email };
        res.json({ success: true });
    } else {
        res.json({ success: false, error: "Invalid email or password" });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('id name email created_at').sort({ created_at: -1 });
        res.json({ success: true, users });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('id name email phone address created_at');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateUser = async (req, res) => {
    const { name, phone, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (phone && !/^[0-9]{10}$/.test(phone)) return res.status(400).json({ success: false, message: 'Phone must be a 10-digit number' });
    if (address && address.length < 5) return res.status(400).json({ success: false, message: 'Address must be at least 5 characters' });

    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.name = name;
        user.phone = phone || null;
        user.address = address || null;
        await user.save();

        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        await User.deleteOne({ _id: req.params.id });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getProducts = async (req, res) => {
    try {
        const products = await Product.aggregate([
            {
                $lookup: {
                    from: 'vendors',
                    localField: 'vendor_id',
                    foreignField: '_id',
                    as: 'vendor'
                }
            },
            { $unwind: '$vendor' },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            {
                $project: {
                    id: '$_id',
                    product_name: 1,
                    product_category: 1,
                    price: { $arrayElemAt: ['$variants.regular_price', 0] },
                    stock: { $arrayElemAt: ['$variants.stock_quantity', 0] },
                    added_date: '$created_at',
                    vendor: '$vendor.store_name'
                }
            },
            { $sort: { created_at: -1 } }
        ]);
        res.json({ success: true, products });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUserStats = async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
        const total = await User.countDocuments();
        const monthly = await User.countDocuments({ created_at: { $gte: new Date(monthAgo) } });
        const weekly = await User.countDocuments({ created_at: { $gte: new Date(weekAgo) } });
        const daily = await User.countDocuments({ created_at: { $gte: new Date(today) } });

        res.json({
            success: true,
            stats: { total, monthly, weekly, daily }
        });
    } catch (err) {
        console.error('Error fetching user stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getProductStats = async (req, res) => {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const total = await Product.countDocuments();
        const totalLastMonth = await Product.countDocuments({ created_at: { $lt: monthAgo } });
        const inStock = await Product.countDocuments({
            _id: { $in: await ProductVariant.find({ stock_quantity: { $gt: 0 } }).distinct('product_id') }
        });
        const inStockLastMonth = await Product.countDocuments({
            _id: { $in: await ProductVariant.find({ stock_quantity: { $gt: 0 }, created_at: { $lt: monthAgo } }).distinct('product_id') }
        });
        const lowStock = await Product.countDocuments({
            _id: { $in: await ProductVariant.aggregate([
                { $group: { _id: '$product_id', totalStock: { $sum: '$stock_quantity' } } },
                { $match: { totalStock: { $gte: 1, $lte: 5 } } }
            ]).then(results => results.map(r => r._id)) }
        });
        const lowStockLastWeek = await Product.countDocuments({
            _id: { $in: await ProductVariant.aggregate([
                { $match: { created_at: { $lt: weekAgo } } },
                { $group: { _id: '$product_id', totalStock: { $sum: '$stock_quantity' } } },
                { $match: { totalStock: { $gte: 1, $lte: 5 } } }
            ]).then(results => results.map(r => r._id)) }
        });
        const outOfStock = await Product.countDocuments({
            _id: { $in: await ProductVariant.aggregate([
                { $group: { _id: '$product_id', totalStock: { $sum: '$stock_quantity' } } },
                { $match: { totalStock: 0 } }
            ]).then(results => results.map(r => r._id)) }
        });
        const outOfStockYesterday = await Product.countDocuments({
            _id: { $in: await ProductVariant.aggregate([
                { $match: { created_at: { $lt: yesterday } } },
                { $group: { _id: '$product_id', totalStock: { $sum: '$stock_quantity' } } },
                { $match: { totalStock: 0 } }
            ]).then(results => results.map(r => r._id)) }
        });

        res.json({
            success: true,
            stats: {
                total,
                totalLastMonth,
                inStock,
                inStockLastMonth,
                lowStock,
                lowStockLastWeek,
                outOfStock,
                outOfStockYesterday
            }
        });
    } catch (err) {
        console.error('Error fetching product stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const dashBoardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalVendors = await Vendor.countDocuments();
        res.json({
            success: true,
            stats: { totalUsers, totalVendors }
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const adminGetUsers = async (req, res) => {
    try {
        const users = await User.find().select('id name email created_at').sort({ created_at: -1 }).limit(5);
        res.json({ success: true, users });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find().select('id name email store_name store_location created_at').sort({ created_at: -1 });
        res.json({ success: true, vendors });
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorStats = async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        const total = await Vendor.countDocuments();
        const monthly = await Vendor.countDocuments({ created_at: { $gte: monthAgo } });
        const weekly = await Vendor.countDocuments({ created_at: { $gte: weekAgo } });
        const daily = await Vendor.countDocuments({ created_at: { $gte: new Date(today) } });

        res.json({
            success: true,
            stats: { total, monthly, weekly, daily }
        });
    } catch (err) {
        console.error('Error fetching vendor stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const adminGetVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find().select('id name email created_at').sort({ created_at: -1 }).limit(5);
        res.json({ success: true, vendors });
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id).select('id name email store_name store_location created_at');
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
        res.json({ success: true, vendor });
    } catch (err) {
        console.error('Error fetching vendor:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorRevenueMetrics = async (req, res) => {
    const vendorId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    try {
        const todayRevenue = await Order.aggregate([
            { $match: { order_date: { $gte: new Date(today), $lt: new Date(new Date(today).setDate(new Date(today).getDate() + 1)) } } },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'items'
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);

        const weeklyRevenue = await Order.aggregate([
            { $match: { order_date: { $gte: oneWeekAgo } } },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'items'
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);

        const monthlyRevenue = await Order.aggregate([
            { $match: { order_date: { $gte: oneMonthAgo } } },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'items'
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);

        const quarterlyRevenue = await Order.aggregate([
            { $match: { order_date: { $gte: threeMonthsAgo } } },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'items'
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);

        const monthlyBreakdown = await Order.aggregate([
            { $match: { order_date: { $gte: threeMonthsAgo } } },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'items'
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$order_date' } },
                    total_sales: { $sum: '$total_amount' },
                    orders: { $addToSet: '$_id' },
                    avg_order_value: { $avg: '$total_amount' }
                }
            },
            {
                $project: {
                    month: '$_id',
                    total_sales: 1,
                    orders: { $size: '$orders' },
                    avg_order_value: 1,
                    _id: 0
                }
            },
            { $sort: { month: -1 } },
            { $limit: 3 }
        ]);

        res.json({
            success: true,
            metrics: {
                today_revenue: todayRevenue[0]?.total || 0,
                weekly_revenue: weeklyRevenue[0]?.total || 0,
                monthly_revenue: monthlyRevenue[0]?.total || 0,
                quarterly_revenue: quarterlyRevenue[0]?.total || 0,
                monthly_breakdown: monthlyBreakdown
            }
        });
    } catch (err) {
        console.error('Error fetching vendor revenue metrics:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorProducts = async (req, res) => {
    try {
        const products = await Product.find({ vendor_id: req.params.id })
            .populate({
                path: 'variants',
                model: 'ProductVariant',
                select: 'regular_price stock_quantity'
            })
            .select('id product_name product_category');
        res.json({
            success: true,
            products: products.map(p => ({
                product_id: p._id,
                product_name: p.product_name,
                category: p.product_category,
                price: p.variants[0]?.regular_price,
                stock: p.variants[0]?.stock_quantity
            }))
        });
    } catch (err) {
        console.error('Error fetching vendor products:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorTopCustomers = async (req, res) => {
    try {
        const customers = await Order.aggregate([
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'items'
                }
            },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $match: { 'product.vendor_id': mongoose.Types.ObjectId(req.params.id) } },
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
                    _id: { id: '$user._id', name: '$user.name' },
                    total_orders: { $sum: 1 },
                    total_spent: { $sum: '$total_amount' },
                    last_purchase: { $max: '$order_date' }
                }
            },
            {
                $project: {
                    customer_id: '$_id.id',
                    customer_name: '$_id.name',
                    total_orders: 1,
                    total_spent: 1,
                    last_purchase: 1,
                    _id: 0
                }
            },
            { $sort: { total_spent: -1 } },
            { $limit: 5 }
        ]);
        res.json({ success: true, customers });
    } catch (err) {
        console.error('Error fetching vendor top customers:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateVendor = async (req, res) => {
    const { vendor_name, store_name, store_location } = req.body;

    if (!vendor_name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (vendor_name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (store_name && store_name.length < 2) return res.status(400).json({ success: false, message: 'Store name must be at least 2 characters' });
    if (store_location && store_location.length < 5) return res.status(400).json({ success: false, message: 'Store location must be at least 5 characters' });

    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        vendor.name = vendor_name;
        vendor.store_name = store_name || null;
        vendor.store_location = store_location || null;
        await vendor.save();

        res.json({ success: true, message: 'Vendor updated successfully' });
    } catch (err) {
        console.error('Error updating vendor:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteVendor = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        const products = await Product.find({ vendor_id: req.params.id });
        const productIds = products.map(p => p._id);

        await OrderItem.deleteMany({ product_id: { $in: productIds } });
        await ProductVariant.deleteMany({ product_id: { $in: productIds } });
        await ProductImage.deleteMany({ product_id: { $in: productIds } });
        await Product.deleteMany({ vendor_id: req.params.id });
        await Vendor.deleteOne({ _id: req.params.id });

        res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (err) {
        console.error('Error deleting vendor:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManagers = async (req, res) => {
    try {
        const eventManagers = await EventManager.find().select('id name email company_name created_at').sort({ created_at: -1 });
        res.json({ success: true, eventManagers });
    } catch (err) {
        console.error('Error fetching event managers:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManagerStats = async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        const total = await EventManager.countDocuments();
        const monthly = await EventManager.countDocuments({ created_at: { $gte: monthAgo } });
        const todayEvents = await Event.countDocuments({ date_time: { $gte: new Date(today), $lt: new Date(new Date(today).setDate(new Date(today).getDate() + 1)) } });
        const revenue = await Event.aggregate([
            { $match: { status: { $in: ['Past', 'Ongoing'] } } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
        ]);

        res.json({
            success: true,
            stats: {
                total,
                monthly,
                todayEvents,
                revenue: revenue[0]?.total || 0
            }
        });
    } catch (err) {
        console.error('Error fetching event manager stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getTotalEvents = async (req, res) => {
    try {
        const total = await Event.countDocuments();
        res.json({ success: true, total });
    } catch (err) {
        console.error('Error fetching total events:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManager = async (req, res) => {
    try {
        const manager = await EventManager.findById(req.params.id).select('id name email contact_number company_name location created_at');
        if (!manager) return res.status(404).json({ success: false, message: 'Event manager not found' });
        res.json({ success: true, manager });
    } catch (err) {
        console.error('Error fetching event manager:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManagerMetrics = async (req, res) => {
    const managerId = req.params.id;
    const today = new Date();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    try {
        const upcoming = await Event.countDocuments({ event_manager_id: managerId, date_time: { $gt: today } });
        const weekly = await Event.countDocuments({ event_manager_id: managerId, date_time: { $gte: weekAgo, $lte: today } });
        const monthly = await Event.countDocuments({ event_manager_id: managerId, date_time: { $gte: monthAgo } });
        const monthlyBreakdown = await Event.aggregate([
            { $match: { event_manager_id: mongoose.Types.ObjectId(managerId), date_time: { $gte: threeMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$date_time' } },
                    total_events: { $sum: 1 },
                    attendees: { $sum: '$tickets_sold' },
                    avg_attendance: { $avg: '$tickets_sold' }
                }
            },
            {
                $project: {
                    month: '$_id',
                    total_events: 1,
                    attendees: 1,
                    avg_attendance: 1,
                    _id: 0
                }
            },
            { $sort: { month: -1 } },
            { $limit: 3 }
        ]);

        res.json({
            success: true,
            metrics: {
                upcoming,
                weekly,
                monthly,
                monthly_breakdown: monthlyBreakdown
            }
        });
    } catch (err) {
        console.error('Error fetching event manager metrics:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUpcomingEvents = async (req, res) => {
    try {
        const events = await Event.find({ event_manager_id: req.params.id, date_time: { $gt: new Date() } })
            .select('id event_name date_time venue total_tickets tickets_sold status')
            .sort({ date_time: 1 });
        res.json({ success: true, events });
    } catch (err) {
        console.error('Error fetching upcoming events:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getPastEvents = async (req, res) => {
    try {
        const events = await Event.find({ event_manager_id: req.params.id, date_time: { $lt: new Date() } })
            .select('id event_name date_time tickets_sold')
            .sort({ date_time: -1 });
        res.json({ success: true, events });
    } catch (err) {
        console.error('Error fetching past events:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateEventManager = async (req, res) => {
    const { name, email, phone, organization } = req.body;

    if (!name || !email || !organization) return res.status(400).json({ success: false, message: 'Name, email, and organization are required' });
    if (name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email format' });
    if (phone && !/^\+91[6-9][0-9]{9}$/.test(phone)) return res.status(400).json({ success: false, message: 'Phone must be a valid Indian number (+91XXXXXXXXXX)' });
    if (organization.length < 3) return res.status(400).json({ success: false, message: 'Organization must be at least 3 characters' });

    try {
        const manager = await EventManager.findById(req.params.id);
        if (!manager) return res.status(404).json({ success: false, message: 'Event manager not found' });

        manager.name = name;
        manager.email = email;
        manager.contact_number = phone || null;
        manager.company_name = organization;
        await manager.save();

        res.json({ success: true, message: 'Event manager updated successfully' });
    } catch (err) {
        console.error('Error updating event manager:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteEventManager = async (req, res) => {
    try {
        const manager = await EventManager.findById(req.params.id);
        if (!manager) return res.status(404).json({ success: false, message: 'Event manager not found' });

        const events = await Event.find({ event_manager_id: req.params.id });
        const eventIds = events.map(e => e._id);

        await EventAttendee.deleteMany({ event_id: { $in: eventIds } });
        await Event.deleteMany({ event_manager_id: req.params.id });
        await EventManager.deleteOne({ _id: req.params.id });

        res.json({ success: true, message: 'Event manager deleted successfully' });
    } catch (err) {
        console.error('Error deleting event manager:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        await OrderItem.deleteMany({ product_id: req.params.id });
        await ProductVariant.deleteMany({ product_id: req.params.id });
        await ProductImage.deleteMany({ product_id: req.params.id });
        await Product.deleteOne({ _id: req.params.id });

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    adminLogin,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    getProducts,
    getUserStats,
    getProductStats,
    dashBoardStats,
    adminGetUsers,
    getVendors,
    getVendorStats,
    adminGetVendors,
    getVendor,
    getVendorRevenueMetrics,
    getVendorProducts,
    getVendorTopCustomers,
    updateVendor,
    deleteVendor,
    getEventManagers,
    getEventManagerStats,
    getTotalEvents,
    getEventManager,
    getEventManagerMetrics,
    getUpcomingEvents,
    getPastEvents,
    updateEventManager,
    deleteEventManager,
    deleteProduct
};