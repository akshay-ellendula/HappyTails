const {
    User,
    Vendor,
    Product,
    ProductVariant,
    ProductImage,
    Order,
    OrderItem,
    Event,
    EventManager,
    EventAttendee
} = require('../models/database');

const mongoose = require('mongoose');

const adminLogin = (req, res) => {
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
        const users = await User.find()
            .select('id user_name user_email created_at')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            users: users.map(user => ({
                id: user._id,
                name: user.user_name,
                email: user.user_email,
                joined_date: user.created_at
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUser = async (req, res) => {
    try {
        const userId = req.params.id;
        // Update the select clause (add 'profile_pic')
    const user = await User.findById(userId)
        .select('id user_name user_email user_phone user_address created_at profile_pic');


        // Fetch purchase history (orders and items)
        const orders = await Order.find({ user_id: userId });
        const orderIds = orders.map(o => o._id);
        const orderItems = await OrderItem.find({ order_id: { $in: orderIds } });
        const purchaseHistory = orderItems.map(item => {
            const order = orders.find(o => o._id.equals(item.order_id));
            return {
                productId: item.product_id ? item.product_id.toString() : 'Unknown',
                productName: item.product_name,
                purchaseDate: order ? order.order_date.toLocaleDateString() : 'Unknown',
                price: item.price ? `$${item.price.toFixed(2)}` : 'N/A'
            };
        });

        // Fetch event history
        const attendees = await EventAttendee.find({ user_id: userId });
        const eventHistory = await Promise.all(attendees.map(async (att) => {
            const ev = await Event.findById(att.event_id);
            if (!ev) return null;
            const now = new Date();
            const status = ev.date_time < now ? 'Attended' : 'Registered';
            return {
                eventId: ev._id.toString(),
                eventName: ev.event_name,
                date: ev.date_time.toLocaleDateString(),
                location: ev.venue,
                status
            };
        }));
        const filteredEventHistory = eventHistory.filter(e => e !== null);

        // Update the user object in res.json (add profile_pic)
            res.json({
                success: true,
                user: {
                    id: user._id.toString(),
                    name: user.user_name,
                    email: user.user_email,
                    phone: user.user_phone || null,
                    address: user.user_address || null,
                    joined_date: user.created_at.toLocaleDateString(),
                    profile_pic: user.profile_pic || null  // Add this line
                },
                purchaseHistory,
                eventHistory: filteredEventHistory
            });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { user_name, user_phone, user_address } = req.body;

        if (!user_name) return res.status(400).json({ success: false, message: 'Name is required' });
        if (user_name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
        if (user_phone && !/^[0-9]{10}$/.test(user_phone)) return res.status(400).json({ success: false, message: 'Phone must be a 10-digit number' });
        if (user_address && user_address.length < 5) return res.status(400).json({ success: false, message: 'Address must be at least 5 characters' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        await User.updateOne(
            { _id: userId },
            { user_name, user_phone: user_phone || null, user_address: user_address || null }
        );
        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        await User.deleteOne({ _id: userId });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
};


const getProductData = async (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return null;
    }
    
    try {
        const product = await Product.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(productId) } },
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
            { $unwind: '$variants' },
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
                    _id: 0,
                    id: '$_id',
                    product_name: 1,
                    product_category: 1,
                    product_type: 1,
                    product_description: 1,
                    stock_status: 1,
                    created_at: 1,
                    sku: '$variants.sku',
                    regular_price: '$variants.regular_price',
                    sale_price: '$variants.sale_price',
                    stock_quantity: '$variants.stock_quantity',
                    vendor: {
                        store_name: '$vendor.store_name',
                        email: '$vendor.email'
                    },
                    image: {
                        $ifNull: [
                            { $arrayElemAt: [{ $filter: { input: '$images', as: 'img', cond: { $eq: ['$$img.is_primary', true] } } }, 0] },
                            { $arrayElemAt: ['$images', 0] }
                        ]
                    }
                }
            },
            {
                $project: {
                    id: 1,
                    product_name: 1,
                    product_category: 1,
                    product_type: 1,
                    product_description: 1,
                    stock_status: 1,
                    created_at: 1,
                    sku: 1,
                    regular_price: 1,
                    sale_price: 1,
                    stock_quantity: 1,
                    vendor: 1,
                    image: '$image.image_data'
                }
            }
        ]);

        return product.length > 0 ? product[0] : null;
    } catch (err) {
        console.error('Error in getProductData:', err);
        throw err;
    }
};

const getProductCustomers = async (productId) => {
    try {
        const customers = await OrderItem.aggregate([
            { $match: { product_id: new mongoose.Types.ObjectId(productId) } },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'order_id',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            { $unwind: '$order' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'order.user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 0,
                    user_name: '$user.user_name',
                    user_email: '$user.user_email',
                    order_date: '$order.order_date',
                    quantity: '$quantity'
                }
            },
            { $sort: { order_date: -1 } }
        ]);

        return customers;
    } catch (err) {
        console.error('Error in getProductCustomers:', err);
        throw err;
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
            { $unwind: '$variants' },
            {
                $group: {
                    _id: '$_id',
                    id: { $first: '$_id' },
                    product_name: { $first: '$product_name' },
                    product_category: { $first: '$product_category' },
                    regular_price: { $first: '$variants.regular_price' },
                    stock_quantity: { $first: '$variants.stock_quantity' },
                    created_at: { $first: '$created_at' },
                    vendor: { $first: '$vendor.store_name' }
                }
            },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    product_name: 1,
                    category: '$product_category',
                    price: '$regular_price',
                    stock: '$stock_quantity',
                    added_date: '$created_at',
                    vendor: 1
                }
            },
            { $sort: { added_date: -1 } }
        ]);
        res.json({ success: true, products });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUserStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const total = await User.countDocuments();
        const monthly = await User.countDocuments({ created_at: { $gte: monthAgo } });
        const weekly = await User.countDocuments({ created_at: { $gte: weekAgo } });
        const daily = await User.countDocuments({ created_at: { $gte: today } });

        res.json({
            success: true,
            stats: { total, monthly, weekly, daily }
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

const getProductStats = async (req, res) => {
    try {
        const today = new Date();
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        const total = await Product.countDocuments();
        const totalLastMonth = await Product.countDocuments({ created_at: { $lt: monthAgo } });

        const inStockResult = await Product.aggregate([
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $match: { 'variants.stock_quantity': { $gt: 0 } } },
            { $group: { _id: null, count: { $addToSet: '$_id' } } },
            { $project: { inStock: { $size: '$count' } } }
        ]);
        const inStock = inStockResult.length > 0 ? inStockResult[0].inStock : 0;

        const inStockLastMonthResult = await Product.aggregate([
            { $match: { created_at: { $lt: monthAgo } } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $match: { 'variants.stock_quantity': { $gt: 0 } } },
            { $group: { _id: null, count: { $addToSet: '$_id' } } },
            { $project: { inStockLastMonth: { $size: '$count' } } }
        ]);
        const inStockLastMonth = inStockLastMonthResult.length > 0 ? inStockLastMonthResult[0].inStockLastMonth : 0;

        const lowStockResult = await Product.aggregate([
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            {
                $group: {
                    _id: '$_id',
                    totalStock: { $sum: '$variants.stock_quantity' }
                }
            },
            { $match: { totalStock: { $gte: 1, $lte: 5 } } },
            { $count: 'lowStock' }
        ]);
        const lowStock = lowStockResult.length > 0 ? lowStockResult[0].lowStock : 0;

        const lowStockLastWeekResult = await Product.aggregate([
            { $match: { created_at: { $lt: weekAgo } } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            {
                $group: {
                    _id: '$_id',
                    totalStock: { $sum: '$variants.stock_quantity' }
                }
            },
            { $match: { totalStock: { $gte: 1, $lte: 5 } } },
            { $count: 'lowStockLastWeek' }
        ]);
        const lowStockLastWeek = lowStockLastWeekResult.length > 0 ? lowStockLastWeekResult[0].lowStockLastWeek : 0;

        const outOfStockResult = await Product.aggregate([
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            {
                $group: {
                    _id: '$_id',
                    totalStock: { $sum: '$variants.stock_quantity' }
                }
            },
            { $match: { totalStock: 0 } },
            { $count: 'outOfStock' }
        ]);
        const outOfStock = outOfStockResult.length > 0 ? outOfStockResult[0].outOfStock : 0;

        const outOfStockYesterdayResult = await Product.aggregate([
            { $match: { created_at: { $lt: yesterday } } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            {
                $group: {
                    _id: '$_id',
                    totalStock: { $sum: '$variants.stock_quantity' }
                }
            },
            { $match: { totalStock: 0 } },
            { $count: 'outOfStockYesterday' }
        ]);
        const outOfStockYesterday = outOfStockYesterdayResult.length > 0 ? outOfStockYesterdayResult[0].outOfStockYesterday : 0;

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
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const dashBoardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const totalUsers = await User.countDocuments();
        const totalUsersLastMonth = await User.countDocuments({ created_at: { $lt: monthAgo } });
        const totalVendors = await Vendor.countDocuments();
        const totalVendorsLastMonth = await Vendor.countDocuments({ created_at: { $lt: monthAgo } });
        const totalEventManagers = await EventManager.countDocuments();
        const totalEventManagersLastMonth = await EventManager.countDocuments({ created_at: { $lt: monthAgo } });

        // Calculate percentage changes
        const userGrowthPercent = totalUsersLastMonth > 0 ? 
            Math.round(((totalUsers - totalUsersLastMonth) / totalUsersLastMonth) * 100) : 0;
        const vendorGrowthPercent = totalVendorsLastMonth > 0 ? 
            Math.round(((totalVendors - totalVendorsLastMonth) / totalVendorsLastMonth) * 100) : 0;
        const eventManagerGrowthPercent = totalEventManagersLastMonth > 0 ? 
            Math.round(((totalEventManagers - totalEventManagersLastMonth) / totalEventManagersLastMonth) * 100) : 0;

        // Calculate revenue from orders (products) and events
        const totalRevenueOrders = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        const totalRevenueOrdersValue = totalRevenueOrders.length > 0 ? totalRevenueOrders[0].total : 0;

        const totalRevenueEvents = await Event.aggregate([
            { $match: { status: { $in: ['Past', 'Ongoing'] } } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
        ]);
        const totalRevenueEventsValue = totalRevenueEvents.length > 0 ? totalRevenueEvents[0].total : 0;

        const totalRevenue = totalRevenueOrdersValue + totalRevenueEventsValue;

        const monthlyRevenueOrders = await Order.aggregate([
            { $match: { order_date: { $gte: monthAgo } } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        const monthlyRevenueOrdersValue = monthlyRevenueOrders.length > 0 ? monthlyRevenueOrders[0].total : 0;

        const monthlyRevenueEvents = await Event.aggregate([
            { $match: { date_time: { $gte: monthAgo }, status: { $in: ['Past', 'Ongoing'] } } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
        ]);
        const monthlyRevenueEventsValue = monthlyRevenueEvents.length > 0 ? monthlyRevenueEvents[0].total : 0;

        const monthlyRevenue = monthlyRevenueOrdersValue + monthlyRevenueEventsValue;

        const lastMonthRevenueOrders = await Order.aggregate([
            { $match: { order_date: { $gte: new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000), $lt: monthAgo } } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        const lastMonthRevenueOrdersValue = lastMonthRevenueOrders.length > 0 ? lastMonthRevenueOrders[0].total : 0;

        const lastMonthRevenueEvents = await Event.aggregate([
            { $match: { date_time: { $gte: new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000), $lt: monthAgo }, status: { $in: ['Past', 'Ongoing'] } } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
        ]);
        const lastMonthRevenueEventsValue = lastMonthRevenueEvents.length > 0 ? lastMonthRevenueEvents[0].total : 0;

        const lastMonthRevenue = lastMonthRevenueOrdersValue + lastMonthRevenueEventsValue;
        const monthlyRevenueGrowthPercent = lastMonthRevenue > 0 ? 
            Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

        const weeklyRevenueOrders = await Order.aggregate([
            { $match: { order_date: { $gte: weekAgo } } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        const weeklyRevenueOrdersValue = weeklyRevenueOrders.length > 0 ? weeklyRevenueOrders[0].total : 0;

        const weeklyRevenueEvents = await Event.aggregate([
            { $match: { date_time: { $gte: weekAgo }, status: { $in: ['Past', 'Ongoing'] } } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
        ]);
        const weeklyRevenueEventsValue = weeklyRevenueEvents.length > 0 ? weeklyRevenueEvents[0].total : 0;

        const weeklyRevenue = weeklyRevenueOrdersValue + weeklyRevenueEventsValue;

        const lastWeekRevenueOrders = await Order.aggregate([
            { $match: { order_date: { $gte: new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000), $lt: weekAgo } } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        const lastWeekRevenueOrdersValue = lastWeekRevenueOrders.length > 0 ? lastWeekRevenueOrders[0].total : 0;

        const lastWeekRevenueEvents = await Event.aggregate([
            { $match: { date_time: { $gte: new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000), $lt: weekAgo }, status: { $in: ['Past', 'Ongoing'] } } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
        ]);
        const lastWeekRevenueEventsValue = lastWeekRevenueEvents.length > 0 ? lastWeekRevenueEvents[0].total : 0;

        const lastWeekRevenue = lastWeekRevenueOrdersValue + lastWeekRevenueEventsValue;
        const weeklyRevenueGrowthPercent = lastWeekRevenue > 0 ? 
            Math.round(((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100) : 0;

        const dailyRevenueOrders = await Order.aggregate([
            { $match: { order_date: { $gte: today } } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        const dailyRevenueOrdersValue = dailyRevenueOrders.length > 0 ? dailyRevenueOrders[0].total : 0;

        const dailyRevenueEvents = await Event.aggregate([
            { $match: { date_time: { $gte: today }, status: { $in: ['Past', 'Ongoing'] } } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
        ]);
        const dailyRevenueEventsValue = dailyRevenueEvents.length > 0 ? dailyRevenueEvents[0].total : 0;

        const dailyRevenue = dailyRevenueOrdersValue + dailyRevenueEventsValue;

        const yesterdayRevenueOrders = await Order.aggregate([
            { $match: { order_date: { $gte: yesterday, $lt: today } } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        const yesterdayRevenueOrdersValue = yesterdayRevenueOrders.length > 0 ? yesterdayRevenueOrders[0].total : 0;

        const yesterdayRevenueEvents = await Event.aggregate([
            { $match: { date_time: { $gte: yesterday, $lt: today }, status: { $in: ['Past', 'Ongoing'] } } },
            { $group: { _id: null, total: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
        ]);
        const yesterdayRevenueEventsValue = yesterdayRevenueEvents.length > 0 ? yesterdayRevenueEvents[0].total : 0;

        const yesterdayRevenue = yesterdayRevenueOrdersValue + yesterdayRevenueEventsValue;
        const dailyRevenueGrowthPercent = yesterdayRevenue > 0 ? 
            Math.round(((dailyRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0;

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalVendors,
                totalEventManagers,
                totalRevenue,
                monthlyRevenue,
                weeklyRevenue,
                dailyRevenue,
                userGrowthPercent,
                vendorGrowthPercent,
                eventManagerGrowthPercent,
                monthlyRevenueGrowthPercent,
                weeklyRevenueGrowthPercent,
                dailyRevenueGrowthPercent
            }
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getRevenueChartData = async (req, res) => {
    try {
        const today = new Date();
        const months = [];
        const petSalesData = [];
        const productsData = [];
        const servicesData = [];

        // Generate last 12 months
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            months.push(monthStart.toLocaleString('default', { month: 'short' }));

            // Pet Sales (Assuming pet sales are a category in products, e.g., product_type: 'Pet')
            const petSales = await Order.aggregate([
                { $match: { order_date: { $gte: monthStart, $lte: monthEnd } } },
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
                { $match: { 'product.product_type': 'Pet' } },
                { $group: { _id: null, total: { $sum: '$total_amount' } } }
            ]);
            petSalesData.push(petSales.length > 0 ? petSales[0].total : 0);

            // Products (All other product types except 'Pet' and 'Service')
            const products = await Order.aggregate([
                { $match: { order_date: { $gte: monthStart, $lte: monthEnd } } },
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
                { $match: { 'product.product_type': { $nin: ['Pet', 'Service'] } } },
                { $group: { _id: null, total: { $sum: '$total_amount' } } }
            ]);
            productsData.push(products.length > 0 ? products[0].total : 0);

            // Services (Assuming product_type: 'Service' or events)
            const servicesOrders = await Order.aggregate([
                { $match: { order_date: { $gte: monthStart, $lte: monthEnd } } },
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
                { $match: { 'product.product_type': 'Service' } },
                { $group: { _id: null, total: { $sum: '$total_amount' } } }
            ]);
            const servicesOrdersValue = servicesOrders.length > 0 ? servicesOrders[0].total : 0;

            const servicesEvents = await Event.aggregate([
                { $match: { date_time: { $gte: monthStart, $lte: monthEnd }, status: { $in: ['Past', 'Ongoing'] } } },
                { $group: { _id: null, total: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
            ]);
            const servicesEventsValue = servicesEvents.length > 0 ? servicesEvents[0].total : 0;

            servicesData.push(servicesOrdersValue + servicesEventsValue);
        }

        res.json({
            success: true,
            chartData: {
                labels: months,
                petSales: petSalesData,
                products: productsData,
                services: servicesData
            }
        });
    } catch (err) {
        console.error('Error fetching revenue chart data:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const adminGetUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('id user_name user_email created_at')
            .sort({ created_at: -1 })
            .limit(5);
        res.json({
            success: true,
            users: users.map(user => ({
                id: user._id,
                name: user.user_name,
                email: user.user_email,
                joined_date: user.created_at
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find()
            .select('id name email store_name store_location created_at')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            vendors: vendors.map(vendor => ({
                id: vendor._id,
                name: vendor.name,
                email: vendor.email,
                store_name: vendor.store_name,
                store_location: vendor.store_location,
                joined_date: vendor.created_at
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total Shop Managers
        const total = await Vendor.countDocuments();
        const totalLastMonth = await Vendor.countDocuments({ created_at: { $lt: monthAgo } });
        const totalGrowthPercent = totalLastMonth > 0 ? 
            Math.round(((total - totalLastMonth) / totalLastMonth) * 100) : 0;

        // Total Revenue Generated
        const totalRevenueResult = await Order.aggregate([
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
            {
                $group: {
                    _id: null,
                    total: { $sum: '$total_amount' }
                }
            }
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        const lastMonthRevenueResult = await Order.aggregate([
            { $match: { order_date: { $gte: new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000), $lt: monthAgo } } },
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
            {
                $group: {
                    _id: null,
                    total: { $sum: '$total_amount' }
                }
            }
        ]);
        const lastMonthRevenue = lastMonthRevenueResult.length > 0 ? lastMonthRevenueResult[0].total : 0;
        const revenueGrowthPercent = lastMonthRevenue > 0 ? 
            Math.round(((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

        // Total Orders (Corrected Logic)
        const totalOrdersResult = await Order.aggregate([
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
            {
                $lookup: {
                    from: 'vendors',
                    localField: 'product.vendor_id',
                    foreignField: '_id',
                    as: 'vendor'
                }
            },
            { $unwind: '$vendor' },
            {
                $group: {
                    _id: '$_id', // Group by order ID to count unique orders
                }
            },
            { $count: 'totalOrders' }
        ]);
        const totalOrders = totalOrdersResult.length > 0 ? totalOrdersResult[0].totalOrders : 0;

        const lastMonthOrdersResult = await Order.aggregate([
            { $match: { order_date: { $gte: new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000), $lt: monthAgo } } },
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
            {
                $lookup: {
                    from: 'vendors',
                    localField: 'product.vendor_id',
                    foreignField: '_id',
                    as: 'vendor'
                }
            },
            { $unwind: '$vendor' },
            {
                $group: {
                    _id: '$_id',
                }
            },
            { $count: 'totalOrders' }
        ]);
        const lastMonthOrders = lastMonthOrdersResult.length > 0 ? lastMonthOrdersResult[0].totalOrders : 0;
        const ordersGrowthPercent = lastMonthOrders > 0 ? 
            Math.round(((totalOrders - lastMonthOrders) / lastMonthOrders) * 100) : 0;

        // Today's Orders (Corrected Logic)
        const todaysOrdersResult = await Order.aggregate([
            { $match: { order_date: { $gte: today } } },
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
            {
                $lookup: {
                    from: 'vendors',
                    localField: 'product.vendor_id',
                    foreignField: '_id',
                    as: 'vendor'
                }
            },
            { $unwind: '$vendor' },
            {
                $group: {
                    _id: '$_id',
                }
            },
            { $count: 'todaysOrders' }
        ]);
        const todaysOrders = todaysOrdersResult.length > 0 ? todaysOrdersResult[0].todaysOrders : 0;

        const yesterdayOrdersResult = await Order.aggregate([
            { $match: { order_date: { $gte: yesterday, $lt: today } } },
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
            {
                $lookup: {
                    from: 'vendors',
                    localField: 'product.vendor_id',
                    foreignField: '_id',
                    as: 'vendor'
                }
            },
            { $unwind: '$vendor' },
            {
                $group: {
                    _id: '$_id',
                }
            },
            { $count: 'yesterdayOrders' }
        ]);
        const yesterdayOrders = yesterdayOrdersResult.length > 0 ? yesterdayOrdersResult[0].yesterdayOrders : 0;
        const todaysOrdersChange = todaysOrders - yesterdayOrders;

        res.json({
            success: true,
            stats: {
                total,
                totalRevenue,
                totalOrders,
                todaysOrders,
                totalGrowthPercent,
                revenueGrowthPercent,
                ordersGrowthPercent,
                todaysOrdersChange
            }
        });
    } catch (err) {
        console.error('Error fetching vendor stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const adminGetVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find()
            .select('id name email created_at')
            .sort({ created_at: -1 })
            .limit(5);
        res.json({
            success: true,
            vendors: vendors.map(vendor => ({
                id: vendor._id,
                name: vendor.name,
                email: vendor.email,
                joined_date: vendor.created_at
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendor = async (req, res) => {
    try {
        const vendorId = req.params.id;
        const vendor = await Vendor.findById(vendorId)
            .select('id name email store_name store_location created_at');
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }
        res.json({
            success: true,
            vendor: {
                id: vendor._id,
                name: vendor.name,
                email: vendor.email,
                store_name: vendor.store_name,
                store_location: vendor.store_location,
                joined_date: vendor.created_at
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorRevenueMetrics = async (req, res) => {
    try {
        const vendorId = req.params.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

        const todayRevenueResult = await Order.aggregate([
            {
                $match: {
                    order_date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
                }
            },
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
            { $match: { 'product.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, today_revenue: { $sum: '$total_amount' } } }
        ]);
        const today_revenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].today_revenue : 0;

        const weeklyRevenueResult = await Order.aggregate([
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
            { $match: { 'product.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, weekly_revenue: { $sum: '$total_amount' } } }
        ]);
        const weekly_revenue = weeklyRevenueResult.length > 0 ? weeklyRevenueResult[0].weekly_revenue : 0;

        const monthlyRevenueResult = await Order.aggregate([
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
            { $match: { 'product.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, monthly_revenue: { $sum: '$total_amount' } } }
        ]);
        const monthly_revenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].monthly_revenue : 0;

        const quarterlyRevenueResult = await Order.aggregate([
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
            { $match: { 'product.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
            { $group: { _id: null, quarterly_revenue: { $sum: '$total_amount' } } }
        ]);
        const quarterly_revenue = quarterlyRevenueResult.length > 0 ? quarterlyRevenueResult[0].quarterly_revenue : 0;

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
            { $match: { 'product.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
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
                today_revenue,
                weekly_revenue,
                monthly_revenue,
                quarterly_revenue,
                monthly_breakdown: monthlyBreakdown
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorProducts = async (req, res) => {
    try {
        const vendorId = req.params.id;
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
            { $unwind: '$variants' },
            {
                $group: {
                    _id: '$_id',
                    product_id: { $first: '$_id' },
                    product_name: { $first: '$product_name' },
                    category: { $first: '$product_category' },
                    price: { $first: '$variants.regular_price' },
                    stock: { $first: '$variants.stock_quantity' }
                }
            },
            {
                $project: {
                    _id: 0,
                    product_id: 1,
                    product_name: 1,
                    category: 1,
                    price: 1,
                    stock: 1
                }
            }
        ]);
        res.json({ success: true, products });
    } catch (err) {
        console.error('Error fetching vendor products:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorTopCustomers = async (req, res) => {
    try {
        const vendorId = req.params.id;
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
            { $match: { 'product.vendor_id': new mongoose.Types.ObjectId(vendorId) } },
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
                    _id: '$user._id',
                    customer_id: { $first: '$user._id' },
                    customer_name: { $first: '$user.user_name' },
                    total_orders: { $addToSet: '$_id' },
                    total_spent: { $sum: '$total_amount' },
                    last_purchase: { $max: '$order_date' }
                }
            },
            {
                $project: {
                    _id: 0,
                    customer_id: 1,
                    customer_name: 1,
                    total_orders: { $size: '$total_orders' },
                    total_spent: 1,
                    last_purchase: 1
                }
            },
            { $sort: { total_spent: -1 } },
            { $limit: 5 }
        ]);
        res.json({ success: true, customers });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateVendor = async (req, res) => {
    try {
        const vendorId = req.params.id;
        const { vendor_name, store_name, store_location } = req.body;

        if (!vendor_name) return res.status(400).json({ success: false, message: 'Name is required' });
        if (vendor_name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
        if (store_name && store_name.length < 2) return res.status(400).json({ success: false, message: 'Store name must be at least 2 characters' });
        if (store_location && store_location.length < 5) return res.status(400).json({ success: false, message: 'Store location must be at least 5 characters' });

        const vendor = await Vendor.findById(vendorId);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        await Vendor.updateOne(
            { _id: vendorId },
            { name: vendor_name, store_name: store_name || null, store_location: store_location || null }
        );
        res.json({ success: true, message: 'Vendor updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update vendor' });
    }
};

const deleteVendor = async (req, res) => {
    try {
        const vendorId = req.params.id;
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        const products = await Product.find({ vendor_id: vendorId });
        const productIds = products.map(product => product._id);

        await OrderItem.deleteMany({ product_id: { $in: productIds } });
        await Product.deleteMany({ vendor_id: vendorId });
        await Vendor.deleteOne({ _id: vendorId });

        res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManagers = async (req, res) => {
    try {
        const eventManagers = await EventManager.find()
            .select('id name email company_name created_at')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            eventManagers: eventManagers.map(manager => ({
                id: manager._id,
                name: manager.name,
                email: manager.email,
                organization: manager.company_name,
                joined_date: manager.created_at
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManagerStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const lastMonthStart = new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total Event Managers
        const total = await EventManager.countDocuments();
        const lastMonthManagers = await EventManager.countDocuments({
            created_at: { $gte: lastMonthStart, $lt: monthAgo }
        });
        const managerGrowthPercent = lastMonthManagers > 0 
            ? Math.round(((total - lastMonthManagers) / lastMonthManagers) * 100) 
            : 0;

        // Total Revenue Generated
        const revenueResult = await Event.aggregate([
            { $match: { status: { $in: ['Past', 'Ongoing'] } } },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } }
                }
            }
        ]);
        const revenue = revenueResult.length > 0 ? revenueResult[0].revenue : 0;

        const lastMonthRevenueResult = await Event.aggregate([
            { 
                $match: { 
                    date_time: { $gte: lastMonthStart, $lt: monthAgo },
                    status: { $in: ['Past', 'Ongoing'] }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } }
                }
            }
        ]);
        const lastMonthRevenue = lastMonthRevenueResult.length > 0 ? lastMonthRevenueResult[0].revenue : 0;
        const revenueGrowthPercent = lastMonthRevenue > 0 
            ? Math.round(((revenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
            : 0;

        // Total Events
        const totalEvents = await Event.countDocuments();
        const lastMonthEvents = await Event.countDocuments({
            created_at: { $gte: lastMonthStart, $lt: monthAgo }
        });
        const eventsGrowthPercent = lastMonthEvents > 0 
            ? Math.round(((totalEvents - lastMonthEvents) / lastMonthEvents) * 100) 
            : 0;

        // Today's Events
        const todayEvents = await Event.countDocuments({
            date_time: { $gte: today, $lt: todayEnd }
        });
        const yesterdayEvents = await Event.countDocuments({
            date_time: { $gte: yesterday, $lt: today }
        });
        const todayEventsChange = todayEvents - yesterdayEvents;

        res.json({
            success: true,
            stats: {
                total,
                revenue,
                totalEvents,
                todayEvents,
                managerGrowthPercent,
                revenueGrowthPercent,
                eventsGrowthPercent,
                todayEventsChange
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
const getTotalEvents = async (req, res) => {
    try {
        const total = await Event.countDocuments();
        res.json({ success: true, total: total || 0 });
    } catch (err) {
        console.error('Error fetching total events:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManager = async (req, res) => {
    try {
        const managerId = req.params.id;
        const manager = await EventManager.findById(managerId)
            .select('id name email contact_number company_name location created_at image');

        if (!manager) {
            return res.status(404).json({ success: false, message: 'Event Manager not found' });
        }

        res.json({
            success: true,
            manager: {
                id: manager._id.toString(),
                name: manager.name,
                email: manager.email,
                phone: manager.contact_number || null,
                organization: manager.company_name || null,
                location: manager.location || null,
                joined_date: manager.created_at,
                image: manager.image || null  // Base64 image string
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManagerMetrics = async (req, res) => {
    try {
        const managerId = req.params.id;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [upcoming, weekly, monthly, monthlyBreakdown] = await Promise.all([
            Event.countDocuments({ event_manager_id: managerId, date_time: { $gte: now } }),
            Event.countDocuments({ event_manager_id: managerId, date_time: { $gte: weekAgo } }),
            Event.countDocuments({ event_manager_id: managerId, date_time: { $gte: monthAgo } }),
            Event.aggregate([
                { $match: { event_manager_id: new mongoose.Types.ObjectId(managerId) } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m", date: "$date_time" } },
                        total_events: { $sum: 1 },
                        attendees: { $sum: "$tickets_sold" }
                    }
                },
                {
                    $project: {
                        month: "$_id",
                        total_events: 1,
                        attendees: 1,
                        avg_attendance: { $divide: ["$attendees", "$total_events"] }
                    }
                },
                { $sort: { month: -1 } },
                { $limit: 6 }  // Last 6 months
            ])
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
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUpcomingEvents = async (req, res) => {
    try {
        const managerId = req.params.id;
        const now = new Date();
        const events = await Event.find({ event_manager_id: managerId, date_time: { $gte: now } })
            .select('id event_name date_time venue total_tickets tickets_sold status')
            .sort({ date_time: 1 })
            .limit(10);

        res.json({
            success: true,
            events: events.map(event => ({
                event_id: event._id.toString(),
                event_name: event.event_name,
                date: event.date_time,
                location: event.venue,
                total_tickets: event.total_tickets,
                tickets_sold: event.tickets_sold,
                status: event.status
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getPastEvents = async (req, res) => {
    try {
        const managerId = req.params.id;
        const now = new Date();
        const events = await Event.find({ event_manager_id: managerId, date_time: { $lt: now } })
            .select('id event_name date_time tickets_sold')
            .sort({ date_time: -1 })
            .limit(10);

        res.json({
            success: true,
            events: events.map(event => ({
                event_id: event._id.toString(),
                event_name: event.event_name,
                date: event.date_time,
                attendees: event.tickets_sold
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateEventManager = async (req, res) => {
    try {
        const managerId = req.params.id;
        const { name, email, phone, organization } = req.body;

        if (!name || name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email' });
        if (phone && !/^\+91[6-9][0-9]{9}$/.test(phone)) return res.status(400).json({ success: false, message: 'Invalid phone number' });
        if (organization && organization.length < 3) return res.status(400).json({ success: false, message: 'Organization must be at least 3 characters' });

        const manager = await EventManager.findById(managerId);
        if (!manager) return res.status(404).json({ success: false, message: 'Event Manager not found' });

        await EventManager.updateOne(
            { _id: managerId },
            { 
                name, 
                email, 
                contact_number: phone || manager.contact_number,
                company_name: organization || manager.company_name
            }
        );
        res.json({ success: true, message: 'Event Manager updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update event manager' });
    }
};

const deleteEventManager = async (req, res) => {
    try {
        const managerId = req.params.id;
        const manager = await EventManager.findById(managerId);
        if (!manager) return res.status(404).json({ success: false, message: 'Event Manager not found' });

        // Delete associated events and attendees
        const events = await Event.find({ event_manager_id: managerId });
        const eventIds = events.map(e => e._id);
        await EventAttendee.deleteMany({ event_id: { $in: eventIds } });
        await Event.deleteMany({ event_manager_id: managerId });

        await EventManager.deleteOne({ _id: managerId });
        res.json({ success: true, message: 'Event Manager deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete event manager' });
    }
};
const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        await OrderItem.deleteMany({ product_id: productId });
        await ProductVariant.deleteMany({ product_id: productId });
        await ProductImage.deleteMany({ product_id: productId });
        await Product.deleteOne({ _id: productId });

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const addProduct = async (req, res) => {
    try {
        const {
            product_name,
            product_category,
            product_type,
            stock_status,
            product_description,
            variants
        } = req.body;

        // Validate required fields
        if (!product_name || !product_category || !product_type || !stock_status || !product_description || !variants) {
            return res.status(400).json({ success: false, message: 'All required fields must be provided' });
        }

        // Since this is an admin action, we'll assign a default vendor for now
        // In a real scenario, you might allow the admin to select a vendor
        const defaultVendor = await Vendor.findOne(); // Get the first vendor for simplicity
        if (!defaultVendor) {
            return res.status(404).json({ success: false, message: 'No vendors available. Please add a vendor first.' });
        }

        // Create the product
        const product = new Product({
            vendor_id: defaultVendor._id,
            product_name,
            product_category,
            product_type,
            product_description,
            stock_status,
            created_at: new Date()
        });

        const savedProduct = await product.save();

        // Parse and save variants
        const parsedVariants = Array.isArray(variants) ? variants : JSON.parse(variants);
        for (const variant of parsedVariants) {
            const productVariant = new ProductVariant({
                product_id: savedProduct._id,
                size: variant.size || null,
                color: variant.color || null,
                regular_price: parseFloat(variant.regular_price),
                sale_price: variant.sale_price ? parseFloat(variant.sale_price) : null,
                stock_quantity: parseInt(variant.stock_quantity),
                sku: variant.sku || null
            });
            await productVariant.save();
        }

        // Handle image uploads
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const productImage = new ProductImage({
                    product_id: savedProduct._id,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: req.files.indexOf(file) === 0 // First image is primary
                });
                await productImage.save();
            }
        }

        res.json({
            success: true,
            message: 'Product added successfully',
            redirect: '/admin-products'
        });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ success: false, message: 'Failed to add product' });
    }
};

const getProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variants = await ProductVariant.find({ product_id: productId });
        const images = await ProductImage.find({ product_id: productId });

        res.json({
            success: true,
            product: {
                id: product._id,
                product_name: product.product_name,
                product_category: product.product_category,
                product_type: product.product_type,
                stock_status: product.stock_status,
                product_description: product.product_description,
                variants: variants.map(v => ({
                    size: v.size,
                    color: v.color,
                    regular_price: v.regular_price,
                    sale_price: v.sale_price,
                    stock_quantity: v.stock_quantity,
                    sku: v.sku
                })),
                images: images.map(img => ({
                    image_path: img.image_path,
                    is_primary: img.is_primary,
                    image_data: img.image_data  // This line is added to include Base64 data
                }))
            }
        });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const {
            product_name,
            product_category,
            product_type,
            stock_status,
            product_description,
            variants
        } = req.body;

        console.log('Received data:', {
            productId,
            product_name,
            product_category,
            product_type,
            stock_status,
            product_description,
            variants,
            files: req.files
        }); // Add this to see the data received by the server

        // Validate required fields
        if (!product_name || !product_category || !product_type || !stock_status || !product_description || !variants) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({ success: false, message: 'All required fields must be provided' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            console.log('Product not found:', productId);
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Update product details
        await Product.updateOne(
            { _id: productId },
            {
                product_name,
                product_category,
                product_type,
                stock_status,
                product_description
            }
        );

        // Delete existing variants and images (to replace with new ones)
        await ProductVariant.deleteMany({ product_id: productId });
        await ProductImage.deleteMany({ product_id: productId });

        // Parse and save new variants
        let parsedVariants;
        try {
            parsedVariants = Array.isArray(variants) ? variants : JSON.parse(variants);
            if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
                console.log('Validation failed: At least one variant is required');
                return res.status(400).json({ success: false, message: 'At least one variant is required' });
            }
        } catch (err) {
            console.log('Error parsing variants:', err);
            return res.status(400).json({ success: false, message: 'Invalid variants data' });
        }
        console.log('Parsed variants:', parsedVariants);
        for (const variant of parsedVariants) {
            const productVariant = new ProductVariant({
                product_id: productId,
                size: variant.size || null,
                color: variant.color || null,
                regular_price: parseFloat(variant.regular_price),
                sale_price: variant.sale_price ? parseFloat(variant.sale_price) : null,
                stock_quantity: parseInt(variant.stock_quantity),
                sku: variant.sku || null
            });
            await productVariant.save();
        }

        // Handle new image uploads
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const productImage = new ProductImage({
                    product_id: productId,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: req.files.indexOf(file) === 0
                });
                await productImage.save();
            }
        }

        res.json({
            success: true,
            message: 'Product updated successfully',
            redirect: '/admin-products'
        });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ success: false, message: 'Failed to update product' });
    }
};


const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error logging out' });
        }
        res.redirect('/admin-login');
    });
};

/**
 * @desc    Get event management stats and event list as JSON data
 * @route   GET /api/admin/events
 * @access  Private (Admin)
 */
const getEventsData = async (req, res) => {
    try {
        // Run all database queries concurrently for better performance
        const [
            totalEvents,
            upcomingEvents,
            completedEvents,
            ticketAggregation,
            events // Also fetch the full event list
        ] = await Promise.all([
            Event.countDocuments(),
            Event.countDocuments({ status: 'Upcoming' }),
            Event.countDocuments({ status: 'Completed' }),
            EventAttendee.aggregate([
                { $group: { _id: null, totalSeats: { $sum: '$seats' } } }
            ]),
            Event.find({})
                 .populate({
                     path: 'event_manager_id',
                     model: 'EventManager',
                     select: 'name'
                 })
                 .sort({ date_time: -1 })
        ]);

        const ticketsSold = ticketAggregation.length > 0 ? ticketAggregation[0].totalSeats : 0;

        // Structure the data and send it as a JSON response
        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalEvents,
                    upcomingEvents,
                    completedEvents,
                    ticketsSold
                },
                events: events // The full list of event objects
            }
        });

    } catch (error) {
        console.error('Error fetching event management data:', error);
        // Send a JSON error response
        res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error' 
        });
    }
};
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        // 2. Find the event to ensure it exists before proceeding
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        // 3. Delete all attendees associated with this event to maintain data integrity
        await EventAttendee.deleteMany({ event_id: id });

        // 4. Delete the event itself
        await Event.findByIdAndDelete(id);

        // 5. Send a success response
        res.status(200).json({ 
            success: true, 
            message: 'Event and all associated attendees deleted successfully.' 
        });

    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error' 
        });
    }
};

// In adminController.js, add the following functions:

const getEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const event = await Event.findById(eventId)
            .populate('event_manager_id', 'name email contact_number company_name')
            .select('_id event_name about_event language duration ticket_price age_limit instructions venue terms category date_time status total_tickets tickets_sold city contact_number image created_at');

        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        res.json({
            success: true,
            event: {
                id: event._id.toString(),
                name: event.event_name,
                about: event.about_event,
                language: event.language,
                duration: event.duration,
                ticket_price: event.ticket_price,
                age_limit: event.age_limit,
                instructions: event.instructions,
                venue: event.venue,
                terms: event.terms,
                category: event.category,
                date_time: event.date_time,
                status: event.status,
                total_tickets: event.total_tickets,
                tickets_sold: event.tickets_sold,
                city: event.city,
                contact_number: event.contact_number,
                image: event.image || null,  // Base64 string
                created_at: event.created_at,
                manager: event.event_manager_id ? {
                    name: event.event_manager_id.name,
                    email: event.event_manager_id.email,
                    phone: event.event_manager_id.contact_number,
                    organization: event.event_manager_id.company_name
                } : null
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventAttendees = async (req, res) => {
    try {
        const eventId = req.params.id;
        const attendees = await EventAttendee.find({ event_id: eventId })
            .populate('user_id', 'user_name user_email user_phone')
            .select('_id ticketId name phone_number email address seats with_pet pet_name pet_breed pet_dob registration_date');

        res.json({
            success: true,
            attendees: attendees.map(att => ({
                id: att._id.toString(),
                ticketId: att.ticketId || 'N/A',
                name: att.name,
                phone: att.phone_number,
                email: att.email,
                address: att.address,
                seats: att.seats,
                with_pet: att.with_pet ? 'Yes' : 'No',
                pet_name: att.pet_name || 'N/A',
                pet_breed: att.pet_breed || 'N/A',
                pet_dob: att.pet_dob ? new Date(att.pet_dob).toLocaleDateString() : 'N/A',
                registration_date: new Date(att.registration_date).toLocaleDateString(),
                user: att.user_id ? {
                    name: att.user_id.user_name,
                    email: att.user_id.user_email,
                    phone: att.user_id.user_phone
                } : null
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const {
            event_name, about_event, language, duration, ticket_price,
            age_limit, instructions, venue, terms, category, date_time,
            total_tickets, city, contact_number
        } = req.body;

        // Validation
        if (!event_name || event_name.length < 3) return res.status(400).json({ success: false, message: 'Event name must be at least 3 characters' });
        if (!about_event || about_event.length < 10) return res.status(400).json({ success: false, message: 'About event must be at least 10 characters' });
        if (!language || language.length < 2) return res.status(400).json({ success: false, message: 'Language must be at least 2 characters' });
        if (!duration || !/^\d+h\s*\d*m?$/.test(duration)) return res.status(400).json({ success: false, message: 'Invalid duration format (e.g., 2h 30m)' });
        if (!ticket_price || ticket_price < 0) return res.status(400).json({ success: false, message: 'Ticket price must be a positive number' });
        if (!age_limit || !/^\d+\+?$/.test(age_limit)) return res.status(400).json({ success: false, message: 'Invalid age limit format (e.g., 18+)' });
        if (!venue || venue.length < 3) return res.status(400).json({ success: false, message: 'Venue must be at least 3 characters' });
        if (!category || category.length < 2) return res.status(400).json({ success: false, message: 'Category must be at least 2 characters' });
        if (!date_time || isNaN(new Date(date_time))) return res.status(400).json({ success: false, message: 'Invalid date and time' });
        if (!total_tickets || total_tickets < 1) return res.status(400).json({ success: false, message: 'Total tickets must be at least 1' });
        if (!city || city.length < 2) return res.status(400).json({ success: false, message: 'City must be at least 2 characters' });
        if (contact_number && !/^\+91[6-9][0-9]{9}$/.test(contact_number)) return res.status(400).json({ success: false, message: 'Invalid phone number' });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        await Event.updateOne(
            { _id: eventId },
            {
                event_name,
                about_event,
                language,
                duration,
                ticket_price,
                age_limit,
                instructions: instructions || event.instructions,
                venue,
                terms: terms || event.terms,
                category,
                date_time,
                total_tickets,
                city,
                contact_number: contact_number || event.contact_number
            }
        );
        res.json({ success: true, message: 'Event updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update event' });
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
    deleteProduct,
    getRevenueChartData,
    addProduct,      
    getProduct,      
    updateProduct,
    logout,
    getEventsData,
    deleteEvent,
    getEvent, 
    getEventAttendees,
    updateEvent,
      getProductData,
    getProductCustomers
};