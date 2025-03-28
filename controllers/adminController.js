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
        `SELECT p.id, p.product_name, p.product_category AS category, 
                pv.regular_price AS price, pv.stock_quantity AS stock, 
                p.created_at AS added_date, v.store_name AS vendor
         FROM products p
         JOIN vendors v ON p.vendor_id = v.id
         JOIN product_variants pv ON p.id = pv.product_id
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
        [],
        (err, products) => {
            if (err) {
                console.error('Error fetching products:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
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
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Total products
    db.get('SELECT COUNT(*) as total FROM products', (err, total) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error' });

        // Total products last month (for percentage change)
        db.get('SELECT COUNT(*) as totalLastMonth FROM products WHERE created_at < ?', [monthAgo], (err, totalLastMonth) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });

            // In stock (at least one variant with stock > 0)
            db.get(
                `SELECT COUNT(DISTINCT p.id) as inStock 
                 FROM products p 
                 JOIN product_variants pv ON p.id = pv.product_id 
                 WHERE pv.stock_quantity > 0`,
                (err, inStock) => {
                    if (err) return res.status(500).json({ success: false, message: 'Server error' });

                    // In stock last month
                    db.get(
                        `SELECT COUNT(DISTINCT p.id) as inStockLastMonth 
                         FROM products p 
                         JOIN product_variants pv ON p.id = pv.product_id 
                         WHERE pv.stock_quantity > 0 AND p.created_at < ?`,
                        [monthAgo],
                        (err, inStockLastMonth) => {
                            if (err) return res.status(500).json({ success: false, message: 'Server error' });

                            // Low stock (total stock across all variants between 1 and 5)
                            db.get(
                                `SELECT COUNT(*) as lowStock 
                                 FROM (
                                     SELECT p.id 
                                     FROM products p 
                                     JOIN product_variants pv ON p.id = pv.product_id 
                                     GROUP BY p.id 
                                     HAVING SUM(pv.stock_quantity) BETWEEN 1 AND 5
                                 )`,
                                (err, lowStock) => {
                                    if (err) return res.status(500).json({ success: false, message: 'Server error' });

                                    // Low stock last week
                                    db.get(
                                        `SELECT COUNT(*) as lowStockLastWeek 
                                         FROM (
                                             SELECT p.id 
                                             FROM products p 
                                             JOIN product_variants pv ON p.id = pv.product_id 
                                             WHERE p.created_at < ? 
                                             GROUP BY p.id 
                                             HAVING SUM(pv.stock_quantity) BETWEEN 1 AND 5
                                         )`,
                                        [weekAgo],
                                        (err, lowStockLastWeek) => {
                                            if (err) return res.status(500).json({ success: false, message: 'Server error' });

                                            // Out of stock (total stock across all variants = 0)
                                            db.get(
                                                `SELECT COUNT(*) as outOfStock 
                                                 FROM (
                                                     SELECT p.id 
                                                     FROM products p 
                                                     JOIN product_variants pv ON p.id = pv.product_id 
                                                     GROUP BY p.id 
                                                     HAVING SUM(pv.stock_quantity) = 0
                                                 )`,
                                                (err, outOfStock) => {
                                                    if (err) return res.status(500).json({ success: false, message: 'Server error' });

                                                    // Out of stock yesterday
                                                    db.get(
                                                        `SELECT COUNT(*) as outOfStockYesterday 
                                                         FROM (
                                                             SELECT p.id 
                                                             FROM products p 
                                                             JOIN product_variants pv ON p.id = pv.product_id 
                                                             WHERE p.created_at < ? 
                                                             GROUP BY p.id 
                                                             HAVING SUM(pv.stock_quantity) = 0
                                                         )`,
                                                        [yesterday],
                                                        (err, outOfStockYesterday) => {
                                                            if (err) return res.status(500).json({ success: false, message: 'Server error' });

                                                            res.json({
                                                                success: true,
                                                                stats: {
                                                                    total: total.total,
                                                                    totalLastMonth: totalLastMonth.totalLastMonth,
                                                                    inStock: inStock.inStock,
                                                                    inStockLastMonth: inStockLastMonth.inStockLastMonth,
                                                                    lowStock: lowStock.lowStock,
                                                                    lowStockLastWeek: lowStockLastWeek.lowStockLastWeek,
                                                                    outOfStock: outOfStock.outOfStock,
                                                                    outOfStockYesterday: outOfStockYesterday.outOfStockYesterday
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
                }
            );
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

const getVendorProducts = (req, res) => {
    const vendorId = req.params.id;
    db.all(
        `SELECT p.id AS product_id, p.product_name, p.product_category AS category, 
                pv.regular_price AS price, pv.stock_quantity AS stock
         FROM products p
         JOIN product_variants pv ON p.id = pv.product_id
         WHERE p.vendor_id = ?
         GROUP BY p.id`,
        [vendorId],
        (err, products) => {
            if (err) {
                console.error('Error fetching vendor products:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
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

const getEventManagers = (req, res) => {
    db.all(
        `SELECT id, name, email, company_name AS organization, created_at AS joined_date 
         FROM event_managers ORDER BY created_at DESC`,
        [],
        (err, eventManagers) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, eventManagers });
        }
    );
};

// Fetch event manager statistics
const getEventManagerStats = (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.get('SELECT COUNT(*) as total FROM event_managers', (err, total) => {
        if (err) return res.status(500).json({ success: false });
        db.get('SELECT COUNT(*) as monthly FROM event_managers WHERE created_at >= ?', [monthAgo], (err, monthly) => {
            if (err) return res.status(500).json({ success: false });
            db.get('SELECT COUNT(*) as today FROM events WHERE date_time LIKE ?', [`${today}%`], (err, todayEvents) => {
                if (err) return res.status(500).json({ success: false });
                db.get(
                    `SELECT SUM(ticket_price * tickets_sold) as revenue 
                     FROM events WHERE status IN ('Past', 'Ongoing')`,
                    (err, revenue) => {
                        if (err) return res.status(500).json({ success: false });
                        res.json({
                            success: true,
                            stats: {
                                total: total.total,
                                monthly: monthly.monthly,
                                todayEvents: todayEvents.today,
                                revenue: revenue.revenue || 0
                            }
                        });
                    }
                );
            });
        });
    });
};

// Fetch total number of events
const getTotalEvents = (req, res) => {
    db.get('SELECT COUNT(*) as total FROM events', (err, result) => {
        if (err) {
            console.error('Error fetching total events:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
        res.json({ success: true, total: result.total || 0 });
    });
};

// controllers/adminController.js

// Fetch a single event manager by ID
const getEventManager = (req, res) => {
    const managerId = req.params.id;
    db.get(
        `SELECT id, name, email, contact_number AS phone, company_name AS organization, 
                location, created_at AS joined_date 
         FROM event_managers WHERE id = ?`,
        [managerId],
        (err, manager) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            if (!manager) return res.status(404).json({ success: false, message: 'Event manager not found' });
            res.json({ success: true, manager });
        }
    );
};

// Fetch event performance metrics for an event manager
const getEventManagerMetrics = (req, res) => {
    const managerId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Upcoming events
    db.get(
        `SELECT COUNT(*) AS upcoming 
         FROM events WHERE event_manager_id = ? AND date_time > ?`,
        [managerId, today],
        (err, upcoming) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });

            // This week's events
            db.get(
                `SELECT COUNT(*) AS weekly 
                 FROM events WHERE event_manager_id = ? AND date_time >= ? AND date_time <= ?`,
                [managerId, weekAgo, today],
                (err, weekly) => {
                    if (err) return res.status(500).json({ success: false, message: 'Server error' });

                    // Monthly events
                    db.get(
                        `SELECT COUNT(*) AS monthly 
                         FROM events WHERE event_manager_id = ? AND date_time >= ?`,
                        [managerId, monthAgo],
                        (err, monthly) => {
                            if (err) return res.status(500).json({ success: false, message: 'Server error' });

                            // Monthly breakdown (last 3 months)
                            db.all(
                                `SELECT 
                                    strftime('%Y-%m', date_time) AS month, 
                                    COUNT(*) AS total_events, 
                                    SUM(tickets_sold) AS attendees, 
                                    AVG(tickets_sold) AS avg_attendance 
                                 FROM events 
                                 WHERE event_manager_id = ? AND date_time >= ? 
                                 GROUP BY strftime('%Y-%m', date_time) 
                                 ORDER BY month DESC 
                                 LIMIT 3`,
                                [managerId, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
                                (err, monthlyBreakdown) => {
                                    if (err) return res.status(500).json({ success: false, message: 'Server error' });

                                    res.json({
                                        success: true,
                                        metrics: {
                                            upcoming: upcoming.upcoming || 0,
                                            weekly: weekly.weekly || 0,
                                            monthly: monthly.monthly || 0,
                                            monthly_breakdown: monthlyBreakdown
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
};

// Fetch upcoming events for an event manager
const getUpcomingEvents = (req, res) => {
    const managerId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    db.all(
        `SELECT id AS event_id, event_name, date_time AS date, venue AS location, 
                total_tickets, tickets_sold, status 
         FROM events 
         WHERE event_manager_id = ? AND date_time > ? 
         ORDER BY date_time ASC`,
        [managerId, today],
        (err, events) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, events });
        }
    );
};

// Fetch past events for an event manager
const getPastEvents = (req, res) => {
    const managerId = req.params.id;
    const today = new Date().toISOString().split('T')[0];
    db.all(
        `SELECT id AS event_id, event_name, date_time AS date, tickets_sold AS attendees 
         FROM events 
         WHERE event_manager_id = ? AND date_time < ? 
         ORDER BY date_time DESC`,
        [managerId, today],
        (err, events) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            res.json({ success: true, events });
        }
    );
};

// Update an event manager
const updateEventManager = (req, res) => {
    const managerId = req.params.id;
    const { name, email, phone, organization } = req.body;

    if (!name || !email || !organization) return res.status(400).json({ success: false, message: 'Name, email, and organization are required' });
    if (name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email format' });
    if (phone && !/^\+91[6-9][0-9]{9}$/.test(phone)) return res.status(400).json({ success: false, message: 'Phone must be a valid Indian number (+91XXXXXXXXXX)' });
    if (organization.length < 3) return res.status(400).json({ success: false, message: 'Organization must be at least 3 characters' });

    db.get('SELECT * FROM event_managers WHERE id = ?', [managerId], (err, manager) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!manager) return res.status(404).json({ success: false, message: 'Event manager not found' });

        db.run(
            `UPDATE event_managers SET name = ?, email = ?, contact_number = ?, company_name = ? WHERE id = ?`,
            [name, email, phone || null, organization, managerId],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Failed to update event manager' });
                res.json({ success: true, message: 'Event manager updated successfully' });
            }
        );
    });
};

// Delete an event manager
const deleteEventManager = (req, res) => {
    const managerId = req.params.id;

    db.get('SELECT * FROM event_managers WHERE id = ?', [managerId], (err, manager) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!manager) return res.status(404).json({ success: false, message: 'Event manager not found' });

        // Delete associated events and attendees first
        db.run('DELETE FROM event_attendees WHERE event_id IN (SELECT id FROM events WHERE event_manager_id = ?)', [managerId], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Server error' });
            db.run('DELETE FROM events WHERE event_manager_id = ?', [managerId], (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Server error' });
                db.run('DELETE FROM event_managers WHERE id = ?', [managerId], (err) => {
                    if (err) return res.status(500).json({ success: false, message: 'Server error' });
                    res.json({ success: true, message: 'Event manager deleted successfully' });
                });
            });
        });
    });
};

const deleteProduct = (req, res) => {
    const productId = req.params.id;

    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        // Step 1: Delete associated order_items
        db.run(
            `DELETE FROM order_items WHERE product_id = ?`,
            [productId],
            (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Server error' });

                // Step 2: Delete associated product_variants
                db.run(`DELETE FROM product_variants WHERE product_id = ?`, [productId], (err) => {
                    if (err) return res.status(500).json({ success: false, message: 'Server error' });

                    // Step 3: Delete associated product_images
                    db.run(`DELETE FROM product_images WHERE product_id = ?`, [productId], (err) => {
                        if (err) return res.status(500).json({ success: false, message: 'Server error' });

                        // Step 4: Delete the product
                        db.run(`DELETE FROM products WHERE id = ?`, [productId], (err) => {
                            if (err) return res.status(500).json({ success: false, message: 'Server error' });
                            res.json({ success: true, message: 'Product deleted successfully' });
                        });
                    });
                });
            }
        );
    });
};

// Add to exports
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
    deleteProduct // Add this
};