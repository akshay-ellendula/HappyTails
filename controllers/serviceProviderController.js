const bcrypt = require('bcryptjs');
const { Vendor, EventManager } = require('../models/database');

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

        // Store user data in session
        if (role === 'event-manager') {
            req.session.eventManager = {
                id: user._id,
                name: user.name,
                email: user.email,
                contact_number: user.contact_number,
                company_name: user.company_name,
                location: user.location
            };
        } else {
            req.session.vendor = {
                id: user._id,
                name: user.name,
                email: user.email,
                store_name: user.store_name,
                store_location: user.store_location
            };
        }

        res.status(200).json({ success: true, redirect: redirectUrl, message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    }
};

module.exports = { serviceProviderLogin };