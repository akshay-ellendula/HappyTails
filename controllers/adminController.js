// controllers/adminController.js
const { db } = require('../models/database');

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

const getUsers = (req, res) => {
    db.all(
        `SELECT id, user_name AS name, user_email AS email, created_at AS joined_date 
         FROM users ORDER BY created_at DESC`,
        [],
        (err, users) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, users });
        }
    );
};

const getUser = (req, res) => {
    const userId = req.params.id;
    db.get(
        `SELECT id, user_name AS name, user_email AS email, user_phone AS phone, 
                user_address AS address, created_at AS joined_date 
         FROM users WHERE id = ?`,
        [userId],
        (err, user) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            res.json({ success: true, user });
        }
    );
};

const updateUser = (req, res) => {
    const userId = req.params.id;
    const { user_name, user_phone, user_address } = req.body;

    if (!user_name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (user_name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (user_phone && !/^[0-9]{10}$/.test(user_phone)) return res.status(400).json({ success: false, message: 'Phone must be a 10-digit number' });
    if (user_address && user_address.length < 5) return res.status(400).json({ success: false, message: 'Address must be at least 5 characters' });

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        db.run(
            `UPDATE users SET user_name = ?, user_phone = ?, user_address = ? WHERE id = ?`,
            [user_name, user_phone || null, user_address || null, userId],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Failed to update user' });
                res.json({ success: true, message: 'User updated successfully' });
            }
        );
    });
};

const deleteUser = (req, res) => {
    const userId = req.params.id;

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
            if (err) return res.status(500).json({ success: false, message: 'Failed to delete user' });
            res.json({ success: true, message: 'User deleted successfully' });
        });
    });
};

const getProducts = (req, res) => {
    db.all(
        `SELECT p.id, p.product_name, p.product_category, p.regular_price, p.stock_quantity, p.created_at,
                (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
         FROM products p ORDER BY p.created_at DESC`,
        [],
        (err, products) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, products });
        }
    );
};

const getUserStats = (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.get('SELECT COUNT(*) as total FROM users', (err, total) => {
        if (err) return res.status(500).json({ success: false });
        db.get('SELECT COUNT(*) as monthly FROM users WHERE created_at >= ?', [monthAgo], (err, monthly) => {
            if (err) return res.status(500).json({ success: false });
            db.get('SELECT COUNT(*) as weekly FROM users WHERE created_at >= ?', [weekAgo], (err, weekly) => {
                if (err) return res.status(500).json({ success: false });
                db.get('SELECT COUNT(*) as daily FROM users WHERE created_at >= ?', [today], (err, daily) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({
                        success: true,
                        stats: { total: total.total, monthly: monthly.monthly, weekly: weekly.weekly, daily: daily.daily }
                    });
                });
            });
        });
    });
};

const getProductStats = (req, res) => {
    db.get('SELECT COUNT(*) as total FROM products', (err, total) => {
        if (err) return res.status(500).json({ success: false });
        db.get('SELECT COUNT(*) as inStock FROM products WHERE stock_quantity > 0', (err, inStock) => {
            if (err) return res.status(500).json({ success: false });
            db.get('SELECT COUNT(*) as lowStock FROM products WHERE stock_quantity BETWEEN 1 AND 10', (err, lowStock) => {
                if (err) return res.status(500).json({ success: false });
                db.get('SELECT COUNT(*) as outOfStock FROM products WHERE stock_quantity = 0', (err, outOfStock) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({
                        success: true,
                        stats: { total: total.total, inStock: inStock.inStock, lowStock: lowStock.lowStock, outOfStock: outOfStock.outOfStock }
                    });
                });
            });
        });
    });
};


const dashBoardStats = (req, res) => {
    db.get('SELECT COUNT(*) as total FROM users', (err, totalUsers) => {
        if (err) {
            console.error('Error fetching total users:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        db.get('SELECT COUNT(*) as total FROM vendors', (err, totalVendors) => {
            if (err) {
                console.error('Error fetching total vendors:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            res.json({
                success: true,
                stats: {
                    totalUsers: totalUsers.total,
                    totalVendors: totalVendors.total
                }
            });
        });
    });
};

const adminGetUsers = (req, res) => {
    db.all(
        `SELECT id, user_name AS name, user_email AS email, created_at AS joined_date 
         FROM users ORDER BY created_at DESC LIMIT 5`,
        [],
        (err, users) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, users });
        }
    );
}

// New functions for Shop Managers (Vendors)
const getVendors = (req, res) => {
    db.all(
        `SELECT id, name, email, store_name, store_location, created_at AS joined_date 
         FROM vendors ORDER BY created_at DESC`,
        [],
        (err, vendors) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, vendors });
        }
    );
};

const getVendorStats = (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.get('SELECT COUNT(*) as total FROM vendors', (err, total) => {
        if (err) return res.status(500).json({ success: false });
        db.get('SELECT COUNT(*) as monthly FROM vendors WHERE created_at >= ?', [monthAgo], (err, monthly) => {
            if (err) return res.status(500).json({ success: false });
            db.get('SELECT COUNT(*) as weekly FROM vendors WHERE created_at >= ?', [weekAgo], (err, weekly) => {
                if (err) return res.status(500).json({ success: false });
                db.get('SELECT COUNT(*) as daily FROM vendors WHERE created_at >= ?', [today], (err, daily) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({
                        success: true,
                        stats: { total: total.total, monthly: monthly.monthly, weekly: weekly.weekly, daily: daily.daily }
                    });
                });
            });
        });
    });
};

const adminGetVendors = (req, res) => {
    db.all(
        `SELECT id, name, email, created_at AS joined_date 
         FROM vendors ORDER BY created_at DESC LIMIT 5`,
        [],
        (err, vendors) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, vendors });
        }
    );
};

// Fetch a single vendor by ID
const getVendor = (req, res) => {
    const vendorId = req.params.id;
    db.get(
        `SELECT id, name, email, store_name, store_location, created_at AS joined_date 
         FROM vendors WHERE id = ?`,
        [vendorId],
        (err, vendor) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
            res.json({ success: true, vendor });
        }
    );
};

// Fetch revenue metrics for a vendor
const getVendorRevenueMetrics = (req, res) => {
    const vendorId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Today's revenue
    db.get(
        `SELECT SUM(o.total_amount) AS today_revenue 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         JOIN orders o ON oi.order_id = o.id 
         WHERE p.vendor_id = ? AND DATE(o.order_date) = ?`,
        [vendorId, today],
        (err, todayResult) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });

            // Weekly revenue
            db.get(
                `SELECT SUM(o.total_amount) AS weekly_revenue 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 JOIN orders o ON oi.order_id = o.id 
                 WHERE p.vendor_id = ? AND o.order_date >= ?`,
                [vendorId, oneWeekAgo],
                (err, weeklyResult) => {
                    if (err) return res.status(500).json({ success: false, message: 'Server error' });

                    // Monthly revenue
                    db.get(
                        `SELECT SUM(o.total_amount) AS monthly_revenue 
                         FROM order_items oi 
                         JOIN products p ON oi.product_id = p.id 
                         JOIN orders o ON oi.order_id = o.id 
                         WHERE p.vendor_id = ? AND o.order_date >= ?`,
                        [vendorId, oneMonthAgo],
                        (err, monthlyResult) => {
                            if (err) return res.status(500).json({ success: false, message: 'Server error' });

                            // Quarterly revenue
                            db.get(
                                `SELECT SUM(o.total_amount) AS quarterly_revenue 
                                 FROM order_items oi 
                                 JOIN products p ON oi.product_id = p.id 
                                 JOIN orders o ON oi.order_id = o.id 
                                 WHERE p.vendor_id = ? AND o.order_date >= ?`,
                                [vendorId, threeMonthsAgo],
                                (err, quarterlyResult) => {
                                    if (err) return res.status(500).json({ success: false, message: 'Server error' });

                                    // Monthly breakdown (last 3 months)
                                    db.all(
                                        `SELECT 
                                            strftime('%Y-%m', o.order_date) AS month, 
                                            SUM(o.total_amount) AS total_sales, 
                                            COUNT(DISTINCT o.id) AS orders, 
                                            AVG(o.total_amount) AS avg_order_value 
                                         FROM order_items oi 
                                         JOIN products p ON oi.product_id = p.id 
                                         JOIN orders o ON oi.order_id = o.id 
                                         WHERE p.vendor_id = ? AND o.order_date >= ?
                                         GROUP BY strftime('%Y-%m', o.order_date) 
                                         ORDER BY month DESC 
                                         LIMIT 3`,
                                        [vendorId, threeMonthsAgo],
                                        (err, monthlyBreakdown) => {
                                            if (err) return res.status(500).json({ success: false, message: 'Server error' });

                                            res.json({
                                                success: true,
                                                metrics: {
                                                    today_revenue: todayResult.today_revenue || 0,
                                                    weekly_revenue: weeklyResult.weekly_revenue || 0,
                                                    monthly_revenue: monthlyResult.monthly_revenue || 0,
                                                    quarterly_revenue: quarterlyResult.quarterly_revenue || 0,
                                                    monthly_breakdown: monthlyBreakdown.map(row => ({
                                                        month: row.month,
                                                        total_sales: row.total_sales,
                                                        orders: row.orders,
                                                        avg_order_value: row.avg_order_value
                                                    }))
                                                }
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// Fetch products managed by the vendor
const getVendorProducts = (req, res) => {
    const vendorId = req.params.id;
    db.all(
        `SELECT id AS product_id, name AS product_name, category, price, stock 
         FROM products 
         WHERE vendor_id = ?`,
        [vendorId],
        (err, products) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, products });
        }
    );
};

// Fetch top customers for the vendor
const getVendorTopCustomers = (req, res) => {
    const vendorId = req.params.id;
    db.all(
        `SELECT 
            u.id AS customer_id, 
            u.name AS customer_name, 
            COUNT(DISTINCT o.id) AS total_orders, 
            SUM(o.total_amount) AS total_spent, 
            MAX(o.order_date) AS last_purchase 
         FROM users u 
         JOIN orders o ON u.id = o.user_id 
         JOIN order_items oi ON o.id = oi.order_id 
         JOIN products p ON oi.product_id = p.id 
         WHERE p.vendor_id = ? 
         GROUP BY u.id, u.name 
         ORDER BY total_spent DESC 
         LIMIT 5`,
        [vendorId],
        (err, customers) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, customers });
        }
    );
};

// Update a vendor's details
const updateVendor = (req, res) => {
    const vendorId = req.params.id;
    const { vendor_name, store_name, store_location } = req.body;

    if (!vendor_name) return res.status(400).json({ success: false, message: 'Name is required' });
    if (vendor_name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (store_name && store_name.length < 2) return res.status(400).json({ success: false, message: 'Store name must be at least 2 characters' });
    if (store_location && store_location.length < 5) return res.status(400).json({ success: false, message: 'Store location must be at least 5 characters' });

    db.get('SELECT * FROM vendors WHERE id = ?', [vendorId], (err, vendor) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        db.run(
            `UPDATE vendors 
             SET name = ?, store_name = ?, store_location = ? 
             WHERE id = ?`,
            [vendor_name, store_name || null, store_location || null, vendorId],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Failed to update vendor' });
                res.json({ success: true, message: 'Vendor updated successfully' });
            }
        );
    });
};

// Delete a vendor
const deleteVendor = (req, res) => {
    const vendorId = req.params.id;

    db.get('SELECT * FROM vendors WHERE id = ?', [vendorId], (err, vendor) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

        // Step 1: Delete associated order_items
        db.run(
            `DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE vendor_id = ?)`,
            [vendorId],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Server error' });

                // Step 2: Delete associated products
                db.run(`DELETE FROM products WHERE vendor_id = ?`, [vendorId], (err) => {
                    if (err) return res.status(500).json({ success: false, message: 'Server error' });

                    // Step 3: Delete the vendor
                    db.run(`DELETE FROM vendors WHERE id = ?`, [vendorId], (err) => {
                        if (err) return res.status(500).json({ success: false, message: 'Server error' });
                        res.json({ success: true, message: 'Vendor deleted successfully' });
                    });
                });
            }
        );
    });
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
    deleteVendor            
};