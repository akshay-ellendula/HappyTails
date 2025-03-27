const bcrypt = require('bcryptjs');
const { db } = require('../models/database');

const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    try {
        let table, redirect, sessionKey;
        if (role === 'store-manager') {
            table = 'vendors';
            redirect = '/shop-dashboard';
            sessionKey = 'vendor';
        } else if (role === 'event-manager') {
            table = 'event_managers';
            redirect = '/eventmanager_dashboard';
            sessionKey = 'eventManager';
        } else {
            return res.status(400).json({ success: false, message: 'Invalid role. Only "store-manager" or "event-manager" supported' });
        }

        db.get(`SELECT * FROM ${table} WHERE email = ?`, [email], async (err, user) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            if (role === 'store-manager') {
                req.session[sessionKey] = { id: user.id, email: user.email, role, store_name: user.store_name };
            } else {
                req.session[sessionKey] = { id: user.id, email: user.email, role, company_name: user.company_name };
                req.session.eventManagerId = user.id; // Ensure compatibility with isAuthenticated
            }
            console.log('Session after login:', req.session); // Debug log
            res.status(200).json({ success: true, message: 'Login successful', redirect });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { serviceProviderLogin };