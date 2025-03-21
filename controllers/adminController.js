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

module.exports = { adminLogin, getUsers, getUser, updateUser, deleteUser, getProducts, getUserStats, getProductStats };