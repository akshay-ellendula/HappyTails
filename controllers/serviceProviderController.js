const bcrypt = require('bcryptjs');
const { Vendor, EventManager } = require('../models/database');

const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ success: false, message: 'All fields required' });

    try {
        const Model = role === 'event-manager' ? EventManager : Vendor;
        const redirectUrl = role === 'event-manager' ? '/eventmanager_dashboard' : '/shop-dashboard';

        const user = await Model.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

        if (role === 'event-manager') req.session.eventManagerId = user._id;
        else req.session.vendorId = user._id;

        res.status(200).json({ success: true, redirect: redirectUrl, message: 'Login successful' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { serviceProviderLogin };