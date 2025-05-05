const mongoose = require('mongoose');
const { User, Vendor, EventManager, Product, ProductVariant, Order, OrderItem, Event, EventAttendee } = require('../models/database');

const adminLogin = (req, res) => {
    const { admin_email, admin_password } = req.body;
    const admin = { email: "admin@gmail.com", password: "admin123#" }; // Hardcoded credentials
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
            .select('user_name user_email created_at')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            users: users.map(user => ({
                id: user._id.toString(),
                name: user.user_name,
                email: user.user_email,
                joined_date: user.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUser = async (req, res) => {
    try {
        const userId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        const user = await User.findById(userId)
            .select('user_name user_email user_phone user_address created_at');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({
            success: true,
            user: {
                id: user._id.toString(),
                name: user.user_name,
                email: user.user_email,
                phone: user.user_phone,
                address: user.user_address,
                joined_date: user.created_at
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        const { user_name, user_phone, user_address } = req.body;

        if (!user_name) return res.status(400).json({ success: false, message: 'Name is required' });
        if (user_name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
        if (user_phone && !/^[0-9]{10}$/.test(user_phone)) return res.status(400).json({ success: false, message: 'Phone must be a 10-digit number' });
        if (user_address && user_address.length < 5) return res.status(400).json({ success: false, message: 'Address must be at least 5 characters' });

        const user = await User.findByIdAndUpdate(
            userId,
            { user_name, user_phone: user_phone || null, user_address: user_address || null },
            { new: true }
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete user' });
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
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    id: '$_id',
                    product_name: 1,
                    category: '$product_category',
                    price: '$variants.regular_price',
                    stock: '$variants.stock_quantity',
                    added_date: '$created_at',
                    vendor: '$vendor.store_name'
                }
            },
            { $sort: { created_at: -1 } },
            { $group: { _id: '$id', product: { $first: '$$ROOT' } } },
            { $replaceRoot: { newRoot: '$product' } }
        ]);
        res.json({
            success: true,
            products: products.map(product => ({
                ...product,
                id: product.id.toString()
            }))
        });
    } catch (error) {
        console.error('Error fetching products:', error);
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
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getProductStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        const total = await Product.countDocuments();
        const totalLastMonth = await Product.countDocuments({ created_at: { $lt: monthAgo } });

        const inStock = await Product.aggregate([
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            { $match: { 'variants.stock_quantity': { $gt: 0 } } },
            { $group: { _id: null, count: { $addToSet: '$_id' } } },
            { $project: { inStock: { $size: '$count' } } }
        ]);

        const inStockLastMonth = await Product.aggregate([
            { $match: { created_at: { $lt: monthAgo } } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            { $match: { 'variants.stock_quantity': { $gt: 0 } } },
            { $group: { _id: null, count: { $addToSet: '$_id' } } },
            { $project: { inStockLastMonth: { $size: '$count' } } }
        ]);

        const lowStock = await Product.aggregate([
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_id',
                    totalStock: { $sum: { $ifNull: ['$variants.stock_quantity', 0] } }
                }
            },
            { $match: { totalStock: { $gte: 1, $lte: 5 } } },
            { $count: 'lowStock' }
        ]);

        const lowStockLastWeek = await Product.aggregate([
            { $match: { created_at: { $lt: weekAgo } } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_id',
                    totalStock: { $sum: { $ifNull: ['$variants.stock_quantity', 0] } }
                }
            },
            { $match: { totalStock: { $gte: 1, $lte: 5 } } },
            { $count: 'lowStockLastWeek' }
        ]);

        const outOfStock = await Product.aggregate([
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_id',
                    totalStock: { $sum: { $ifNull: ['$variants.stock_quantity', 0] } }
                }
            },
            { $match: { totalStock: 0 } },
            { $count: 'outOfStock' }
        ]);

        const outOfStockYesterday = await Product.aggregate([
            { $match: { created_at: { $lt: yesterday } } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_id',
                    totalStock: { $sum: { $ifNull: ['$variants.stock_quantity', 0] } }
                }
            },
            { $match: { totalStock: 0 } },
            { $count: 'outOfStockYesterday' }
        ]);

        res.json({
            success: true,
            stats: {
                total,
                totalLastMonth,
                inStock: inStock[0]?.inStock || 0,
                inStockLastMonth: inStockLastMonth[0]?.inStockLastMonth || 0,
                lowStock: lowStock[0]?.lowStock || 0,
                lowStockLastWeek: lowStockLastWeek[0]?.lowStockLastWeek || 0,
                outOfStock: outOfStock[0]?.outOfStock || 0,
                outOfStockYesterday: outOfStockYesterday[0]?.outOfStockYesterday || 0
            }
        });
    } catch (error) {
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
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const adminGetUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('user_name user_email created_at')
            .sort({ created_at: -1 })
            .limit(5);
        res.json({
            success: true,
            users: users.map(user => ({
                id: user._id.toString(),
                name: user.user_name,
                email: user.user_email,
                joined_date: user.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find()
            .select('name email store_name store_location created_at')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            vendors: vendors.map(vendor => ({
                id: vendor._id.toString(),
                name: vendor.name,
                email: vendor.email,
                store_name: vendor.store_name,
                store_location: vendor.store_location,
                joined_date: vendor.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const total = await Vendor.countDocuments();
        const monthly = await Vendor.countDocuments({ created_at: { $gte: monthAgo } });
        const weekly = await Vendor.countDocuments({ created_at: { $gte: weekAgo } });
        const daily = await Vendor.countDocuments({ created_at: { $gte: today } });

        res.json({
            success: true,
            stats: { total, monthly, weekly, daily }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const adminGetVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find()
            .select('name email created_at')
            .sort({ created_at: -1 })
            .limit(5);
        res.json({
            success: true,
            vendors: vendors.map(vendor => ({
                id: vendor._id.toString(),
                name: vendor.name,
                email: vendor.email,
                joined_date: vendor.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendor = async (req, res) => {
    try {
        const vendorId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
        }
        const vendor = await Vendor.findById(vendorId)
            .select('name email store_name store_location created_at');
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
        res.json({
            success: true,
            vendor: {
                id: vendor._id.toString(),
                name: vendor.name,
                email: vendor.email,
                store_name: vendor.store_name,
                store_location: vendor.store_location,
                joined_date: vendor.created_at
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorRevenueMetrics = async (req, res) => {
    try {
        const vendorId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
        }
        const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

        const todayRevenue = await Order.aggregate([
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
            { $match: { 'product.vendor_id': vendorObjectId } },
            { $group: { _id: null, today_revenue: { $sum: '$total_amount' } } }
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
            { $match: { 'product.vendor_id': vendorObjectId } },
            { $group: { _id: null, weekly_revenue: { $sum: '$total_amount' } } }
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
            { $match: { 'product.vendor_id': vendorObjectId } },
            { $group: { _id: null, monthly_revenue: { $sum: '$total_amount' } } }
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
            { $match: { 'product.vendor_id': vendorObjectId } },
            { $group: { _id: null, quarterly_revenue: { $sum: '$total_amount' } } }
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
            { $match: { 'product.vendor_id': vendorObjectId } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$order_date" } },
                    total_sales: { $sum: '$total_amount' },
                    orders: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    month: '$_id',
                    total_sales: 1,
                    orders: { $size: '$orders' },
                    avg_order_value: { $divide: ['$total_sales', { $size: '$orders' }] }
                }
            },
            { $sort: { month: -1 } },
            { $limit: 3 }
        ]);

        res.json({
            success: true,
            metrics: {
                today_revenue: todayRevenue[0]?.today_revenue || 0,
                weekly_revenue: weeklyRevenue[0]?.weekly_revenue || 0,
                monthly_revenue: monthlyRevenue[0]?.monthly_revenue || 0,
                quarterly_revenue: quarterlyRevenue[0]?.quarterly_revenue || 0,
                monthly_breakdown: monthlyBreakdown
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorProducts = async (req, res) => {
    try {
        const vendorId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
        }
        const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
        const products = await Product.aggregate([
            { $match: { vendor_id: vendorObjectId } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            { $unwind: { path: '$variants', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    product_id: '$_id',
                    product_name: 1,
                    category: '$product_category',
                    price: '$variants.regular_price',
                    stock: '$variants.stock_quantity'
                }
            },
            { $group: { _id: '$product_id', product: { $first: '$$ROOT' } } },
            { $replaceRoot: { newRoot: '$product' } }
        ]);
        res.json({
            success: true,
            products: products.map(product => ({
                ...product,
                product_id: product.product_id.toString()
            }))
        });
    } catch (error) {
        console.error('Error fetching vendor products:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorTopCustomers = async (req, res) => {
    try {
        const vendorId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
        }
        const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
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
            { $match: { 'product.vendor_id': vendorObjectId } },
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
                    customer_name: { $first: '$user.user_name' },
                    total_orders: { $addToSet: '$_id' },
                    total_spent: { $sum: '$total_amount' },
                    last_purchase: { $max: '$order_date' }
                }
            },
            {
                $project: {
                    customer_id: '$_id',
                    customer_name: 1,
                    total_orders: { $size: '$total_orders' },
                    total_spent: 1,
                    last_purchase: 1
                }
            },
            { $sort: { total_spent: -1 } },
            { $limit: 5 }
        ]);
        res.json({
            success: true,
            customers: customers.map(customer => ({
                ...customer,
                customer_id: customer.customer_id.toString()
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateVendor = async (req, res) => {
    try {
        const vendorId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
        }
        const { vendor_name, store_name, store_location } = req.body;

        if (!vendor_name) return res.status(400).json({ success: false, message: 'Name is required' });
        if (vendor_name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
        if (store_name && store_name.length < 2) return res.status(400).json({ success: false, message: 'Store name must be at least 2 characters' });
        if (store_location && store_location.length < 5) return res.status(400).json({ success: false, message: 'Store location must be at least 5 characters' });

        const vendor = await Vendor.findByIdAndUpdate(
            vendorId,
            { name: vendor_name, store_name: store_name || null, store_location: store_location || null },
            { new: true }
        );
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        res.json({ success: true, message: 'Vendor updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update vendor' });
    }
};

const deleteVendor = async (req, res) => {
    try {
        const vendorId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
        }
        const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        // Delete associated order items
        const products = await Product.find({ vendor_id: vendorObjectId });
        const productIds = products.map(p => p._id);
        await OrderItem.deleteMany({ product_id: { $in: productIds } });

        // Delete associated products and their variants
        await ProductVariant.deleteMany({ product_id: { $in: productIds } });
        await Product.deleteMany({ vendor_id: vendorObjectId });

        // Delete the vendor
        await Vendor.findByIdAndDelete(vendorId);

        res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManagers = async (req, res) => {
    try {
        const eventManagers = await EventManager.find()
            .select('name email company_name created_at')
            .sort({ created_at: -1 });
        res.json({
            success: true,
            eventManagers: eventManagers.map(manager => ({
                id: manager._id.toString(),
                name: manager.name,
                email: manager.email,
                organization: manager.company_name,
                joined_date: manager.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManagerStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const total = await EventManager.countDocuments();
        const monthly = await EventManager.countDocuments({ created_at: { $gte: monthAgo } });
        const todayEvents = await Event.countDocuments({
            date_time: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        });
        const revenue = await Event.aggregate([
            { $match: { status: { $in: ['Past', 'Ongoing'] } } },
            { $group: { _id: null, revenue: { $sum: { $multiply: ['$ticket_price', '$tickets_sold'] } } } }
        ]);

        res.json({
            success: true,
            stats: {
                total,
                monthly,
                todayEvents,
                revenue: revenue[0]?.revenue || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getTotalEvents = async (req, res) => {
    try {
        const total = await Event.countDocuments();
        res.json({ success: true, total: total || 0 });
    } catch (error) {
        console.error('Error fetching total events:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManager = async (req, res) => {
    try {
        const managerId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
            return res.status(400).json({ success: false, message: 'Invalid event manager ID' });
        }
        const manager = await EventManager.findById(managerId)
            .select('name email contact_number company_name location created_at');
        if (!manager) return res.status(404).json({ success: false, message: 'Event manager not found' });
        res.json({
            success: true,
            manager: {
                id: manager._id.toString(),
                name: manager.name,
                email: manager.email,
                phone: manager.contact_number,
                organization: manager.company_name,
                location: manager.location,
                joined_date: manager.created_at
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getEventManagerMetrics = async (req, res) => {
    try {
        const managerId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
            return res.status(400).json({ success: false, message: 'Invalid event manager ID' });
        }
        const managerObjectId = new mongoose.Types.ObjectId(managerId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

        const upcoming = await Event.countDocuments({ event_manager_id: managerObjectId, date_time: { $gt: today } });
        const weekly = await Event.countDocuments({
            event_manager_id: managerObjectId,
            date_time: { $gte: weekAgo, $lte: today }
        });
        const monthly = await Event.countDocuments({ event_manager_id: managerObjectId, date_time: { $gte: monthAgo } });

        const monthlyBreakdown = await Event.aggregate([
            { $match: { event_manager_id: managerObjectId, date_time: { $gte: threeMonthsAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$date_time" } },
                    total_events: { $sum: 1 },
                    attendees: { $sum: '$tickets_sold' }
                }
            },
            {
                $project: {
                    month: '$_id',
                    total_events: 1,
                    attendees: 1,
                    avg_attendance: { $divide: ['$attendees', '$total_events'] }
                }
            },
            { $sort: { month: -1 } },
            { $limit: 3 }
        ]);

        res.json({
            success: true,
            metrics: {
                upcoming: upcoming || 0,
                weekly: weekly || 0,
                monthly: monthly || 0,
                monthly_breakdown: monthlyBreakdown
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getUpcomingEvents = async (req, res) => {
    try {
        const managerId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
            return res.status(400).json({ success: false, message: 'Invalid event manager ID' });
        }
        const managerObjectId = new mongoose.Types.ObjectId(managerId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const events = await Event.find({
            event_manager_id: managerObjectId,
            date_time: { $gt: today }
        })
            .select('event_name date_time venue total_tickets tickets_sold status')
            .sort({ date_time: 1 });
        res.json({
            success: true,
            events: events.map(event => ({
                event_id: event._id.toString(),
                event_name: event.event_name,
                date_time: event.date_time,
                venue: event.venue,
                total_tickets: event.total_tickets,
                tickets_sold: event.tickets_sold,
                status: event.status
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }
        const productObjectId = new mongoose.Types.ObjectId(productId);

        // Check if the product exists
        const product = await Product.findById(productObjectId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Delete associated product variants and images
        await ProductVariant.deleteMany({ product_id: productObjectId });
        await ProductImage.deleteMany({ product_id: productObjectId });

        // Delete associated order items
        await OrderItem.deleteMany({ product_id: productObjectId });

        // Delete the product
        await Product.findByIdAndDelete(productObjectId);

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
};

const getPastEvents = async (req, res) => {
    try {
        const managerId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
            return res.status(400).json({ success: false, message: 'Invalid event manager ID' });
        }
        const managerObjectId = new mongoose.Types.ObjectId(managerId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const events = await Event.find({
            event_manager_id: managerObjectId,
            date_time: { $lt: today }
        })
            .select('event_name date_time venue total_tickets tickets_sold status')
            .sort({ date_time: -1 });
        res.json({
            success: true,
            events: events.map(event => ({
                event_id: event._id.toString(),
                event_name: event.event_name,
                date_time: event.date_time,
                venue: event.venue,
                total_tickets: event.total_tickets,
                tickets_sold: event.tickets_sold,
                status: event.status
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateEventManager = async (req, res) => {
    try {
        const managerId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
            return res.status(400).json({ success: false, message: 'Invalid event manager ID' });
        }
        const { name, contact_number, company_name, location } = req.body;

        if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
        if (name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
        if (contact_number && !/^[0-9]{10}$/.test(contact_number)) return res.status(400).json({ success: false, message: 'Phone must be a 10-digit number' });
        if (company_name && company_name.length < 2) return res.status(400).json({ success: false, message: 'Company name must be at least 2 characters' });
        if (location && location.length < 5) return res.status(400).json({ success: false, message: 'Location must be at least 5 characters' });

        const manager = await EventManager.findByIdAndUpdate(
            managerId,
            { name, contact_number: contact_number || null, company_name: company_name || null, location: location || null },
            { new: true }
        );
        if (!manager) return res.status(404).json({ success: false, message: 'Event manager not found' });

        res.json({ success: true, message: 'Event manager updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update event manager' });
    }
};

const deleteEventManager = async (req, res) => {
    try {
        const managerId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
            return res.status(400).json({ success: false, message: 'Invalid event manager ID' });
        }
        const managerObjectId = new mongoose.Types.ObjectId(managerId);
        const manager = await EventManager.findById(managerId);
        if (!manager) return res.status(404).json({ success: false, message: 'Event manager not found' });

        // Delete associated events and attendees
        const events = await Event.find({ event_manager_id: managerObjectId });
        const eventIds = events.map(e => e._id);
        await EventAttendee.deleteMany({ event_id: { $in: eventIds } });
        await Event.deleteMany({ event_manager_id: managerObjectId });

        // Delete the event manager
        await EventManager.findByIdAndDelete(managerId);

        res.json({ success: true, message: 'Event manager deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete event manager' });
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