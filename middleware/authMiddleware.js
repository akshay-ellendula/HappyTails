const mongoose = require('mongoose');

const isVendorAuthenticated = (req, res, next) => {
    if (!req.session.vendor || !req.session.vendor.id) {
        return res.status(403).json({ success: false, message: 'Vendor access required' });
    }

    // Validate vendor ID
    if (!mongoose.Types.ObjectId.isValid(req.session.vendor.id)) {
        return res.status(403).json({ success: false, message: 'Invalid vendor session' });
    }

    // Validate role
    if (req.session.vendor.role !== 'vendor') {
        return res.status(403).json({ success: false, message: 'Vendor role required' });
    }

    next();
};

const isEventManagerAuthenticated = (req, res, next) => {
    if (!req.session.eventManager || !req.session.eventManager.id) {
        return res.status(403).json({ success: false, message: 'Event Manager access required' });
    }

    // Validate event manager ID
    if (!mongoose.Types.ObjectId.isValid(req.session.eventManager.id)) {
        return res.status(403).json({ success: false, message: 'Invalid event manager session' });
    }

    // Validate role
    if (req.session.eventManager.role !== 'event-manager') {
        return res.status(403).json({ success: false, message: 'Event Manager role required' });
    }

    next();
};

const isAdminAuthenticated = (req, res, next) => {
    if (!req.session.admin || !req.session.admin.id) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Validate admin ID (assuming admin session also has an ID field)
    if (!mongoose.Types.ObjectId.isValid(req.session.admin.id)) {
        return res.status(403).json({ success: false, message: 'Invalid admin session' });
    }

    next();
};

const isUserAuthenticated = (req, res, next) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(req.session.user.id)) {
        return res.status(401).json({ success: false, message: 'Invalid user session' });
    }

    next();
};

module.exports = { isVendorAuthenticated, isEventManagerAuthenticated, isAdminAuthenticated, isUserAuthenticated };