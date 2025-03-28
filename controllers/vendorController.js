// controllers/vendorController.js
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');

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
        db.get("SELECT * FROM vendors WHERE email = ?", [email], async (err, row) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (row) return res.status(400).json({ success: false, message: 'Email already registered' });

            const hashedPassword = await bcrypt.hash(password, 10);
            db.run(
                `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES (?, ?, ?, ?, ?, ?)`,
                [name, contactnumber, email, hashedPassword, storename, storelocation],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: 'Database error' });
                    res.status(201).json({ success: true, redirect: '/shop-dashboard', message: 'Vendor signup successful' });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { storeSignup };