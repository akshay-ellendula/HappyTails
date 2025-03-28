// controllers/serviceProviderController.js
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');

const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ success: false, message: 'All fields required' });

    const table = role === 'event-manager' ? 'event_managers' : 'vendors';
    const redirectUrl = role === 'event-manager' ? '/eventmanager_dashboard' : '/shop-dashboard';

    db.get(`SELECT * FROM ${table} WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

        if (role === 'event-manager') req.session.eventManagerId = user.id;
        else req.session.vendorId = user.id;

        res.status(200).json({ success: true, redirect: redirectUrl, message: 'Login successful' });
    });
};
module.exports = { serviceProviderLogin };

