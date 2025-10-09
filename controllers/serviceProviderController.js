const bcrypt = require('bcryptjs');
const { Vendor, EventManager } = require('../models/database');

const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ success: false, message: 'All fields required' });

    try {
        const Model = role === 'event-manager' ? EventManager : Vendor;
        let redirectUrl;

        const user = await Model.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

        if (role === 'event-manager') {
            req.session.eventManager = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                contact_number: user.contact_number,
                company_name: user.company_name,
                location: user.location,
                event_type: user.event_type || 'Pet Events',
                license: user.license || `EVENT-${user._id}-AB`,
                bio: user.bio || `Experienced event manager specializing in pet events. Based in ${user.location}, working with ${user.company_name}.`,
                image: user.image || null,
                member_since: user.member_since || new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            };
            redirectUrl = '/eventmanager_dashboard';
        } else if (role === 'store-manager') {
            req.session.vendor = {
                id: user._id.toString(),
                email: user.email,
                store_name: user.store_name,
                role: 'store-manager'
            };
            const storeNameSlug = user.store_name.toLowerCase().replace(/\s+/g, '-');
            redirectUrl = `/shop-dashboard/${storeNameSlug}`;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid role. Use "store-manager" or "event-manager"' });
        }

        res.status(200).json({ success: true, redirect: redirectUrl, message: 'Login successful' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { serviceProviderLogin };