// controllers/authController.js
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');

const signup = async (req, res) => {
    const { user_name, user_email, user_password } = req.body;
    if (!user_name || !user_email || !user_password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (user_password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    try {
        db.get("SELECT * FROM users WHERE user_email = ?", [user_email], async (err, row) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (row) return res.status(400).json({ success: false, message: 'Email already registered' });

            const hashedPassword = await bcrypt.hash(user_password, 10);
            db.run(
                "INSERT INTO users (user_name, user_email, user_password) VALUES (?, ?, ?)",
                [user_name, user_email, hashedPassword],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: 'Database error' });
                    res.status(201).json({ success: true, message: 'Signup successful' });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const login = async (req, res) => {
    const { user_email, user_password } = req.body;
    if (!user_email || !user_password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        db.get("SELECT * FROM users WHERE user_email = ?", [user_email], async (err, user) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            const isMatch = await bcrypt.compare(user_password, user.user_password);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            req.session.user = { id: user.id, user_name: user.user_name, user_email: user.user_email };
            res.status(200).json({ success: true, redirect: '/home', message: 'Login successful' });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
        res.redirect('/home');
    });
};

module.exports = { signup, login, logout };