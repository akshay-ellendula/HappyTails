// middleware/authMiddleware.js
const isVendorAuthenticated = (req, res, next) => {
    if (req.session.vendor) next();
    else res.status(403).json({ success: false, message: 'Vendor access required' });
};

const isAdminAuthenticated = (req, res, next) => {
    if (req.session.admin) next();
    else res.status(403).json({ success: false, message: 'Admin access required' });
};

module.exports = { isVendorAuthenticated, isAdminAuthenticated };