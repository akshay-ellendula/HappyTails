// middleware/authMiddleware.js
const isVendorAuthenticated = (req, res, next) => {
    if (req.session.vendor) next();
    else res.status(403).json({ success: false, message: 'Vendor access required' });
};

const isAdminAuthenticated = (req, res, next) => {
    if (req.session.admin) next();
    else res.status(403).json({ success: false, message: 'Admin access required' });
};

const isUserAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    next();
};

module.exports = { isVendorAuthenticated, isAdminAuthenticated, isUserAuthenticated };