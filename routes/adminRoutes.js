// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { 
    adminLogin, 
    getUsers, 
    getUser, 
    updateUser, 
    deleteUser, 
    getProducts, 
    getUserStats, 
    getProductStats, 
    dashBoardStats, 
    adminGetUsers, 
    getVendors, 
    getVendorStats, 
    adminGetVendors, 
    getVendor,             
    getVendorRevenueMetrics, 
    getVendorProducts,      
    getVendorTopCustomers,  
    updateVendor,           
    deleteVendor            
} = require('../controllers/adminController');
const { isAdminAuthenticated } = require('../middleware/authMiddleware');

// Existing routes
router.post('/admin-login', adminLogin);
router.get('/admin/users', isAdminAuthenticated, getUsers);
router.get('/admin/user/:id', isAdminAuthenticated, getUser);
router.put('/admin/user/:id', isAdminAuthenticated, updateUser);
router.delete('/admin/user/:id', isAdminAuthenticated, deleteUser);
router.get('/admin/products', isAdminAuthenticated, getProducts);
router.get('/admin/user-stats', isAdminAuthenticated, getUserStats);
router.get('/admin/product-stats', isAdminAuthenticated, getProductStats);
router.get('/admin/dashboard-stats', isAdminAuthenticated, dashBoardStats);
router.get('/admin/get-users', isAdminAuthenticated, adminGetUsers); // to get recent 5 users in admin dashboard
router.get('/admin/vendors', isAdminAuthenticated, getVendors);
router.get('/admin/vendor-stats', isAdminAuthenticated, getVendorStats);
router.get('/admin/get-vendors', isAdminAuthenticated, adminGetVendors);

// New routes for shop manager (vendor) details
router.get('/admin/vendor/:id', isAdminAuthenticated, getVendor);
router.get('/admin/vendor/:id/revenue-metrics', isAdminAuthenticated, getVendorRevenueMetrics);
router.get('/admin/vendor/:id/products', isAdminAuthenticated, getVendorProducts);
router.get('/admin/vendor/:id/top-customers', isAdminAuthenticated, getVendorTopCustomers);
router.put('/admin/vendor/:id', isAdminAuthenticated, updateVendor);
router.delete('/admin/vendor/:id', isAdminAuthenticated, deleteVendor);

module.exports = router;