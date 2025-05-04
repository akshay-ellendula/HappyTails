const bcrypt = require('bcryptjs');
const { EventManager, Vendor } = require('../models/database');

const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ success: false, message: 'All fields required' });

    const Model = role === 'event-manager' ? EventManager : Vendor;
    const redirectUrl = role === 'event-manager' ? '/eventmanager_dashboard' : '/shop-dashboard';

    try {
        const user = await Model.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

        if (role === 'event-manager') req.session.eventManagerId = user._id.toString();
        else req.session.vendorId = user._id.toString();

        res.status(200).json({ success: true, redirect: redirectUrl, message: 'Login successful' });
    } catch (err) {
        console.error('Error during service provider login:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { serviceProviderLogin };