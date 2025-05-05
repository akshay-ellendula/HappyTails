const bcrypt = require('bcryptjs');
const { Vendor, EventManager } = require('../models/database');

const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;

    // Input validation
    if (!email || !password || !role) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'email', message: 'Please enter a valid email address' }]
        });
    }
    if (!['event-manager', 'vendor'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'role', message: 'Invalid role selected' }]
        });
    }

    const Model = role === 'event-manager' ? EventManager : Vendor;
    const redirectUrl = role === 'event-manager' ? '/eventmanager_dashboard' : '/shop-dashboard';

    try {
        const user = await Model.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Store user data in session with consistent keys and stringified IDs
        if (role === 'event-manager') {
            req.session.eventManager = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: 'event-manager',
                contact_number: user.contact_number,
                company_name: user.company_name,
                location: user.location
            };
        } else {
            req.session.vendor = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: 'vendor',
                store_name: user.store_name,
                store_location: user.store_location
            };
        }

        res.status(200).json({ success: true, redirect: redirectUrl, message: 'Login successful' });
    } catch (error) {
        console.error('Error during service provider login:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

module.exports = { serviceProviderLogin };