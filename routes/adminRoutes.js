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
    deleteVendor,
    getEventManagers,
    getEventManagerStats,
    getTotalEvents,
    getEventManager,
    getEventManagerMetrics,
    getUpcomingEvents,
    getPastEvents,
    updateEventManager,
    deleteEventManager,
    deleteProduct,
    getRevenueChartData
} = require('../controllers/adminController');
const { isAdminAuthenticated } = require('../middleware/authMiddleware');

// Existing routes
router.post('/admin-login', adminLogin);
router.get('/admin/users', isAdminAuthenticated, getUsers);
router.get('/admin/user/:id', isAdminAuthenticated, getUser);
router.put('/admin/user/:id', isAdminAuthenticated, updateUser);
router.delete('/admin/user/:id', isAdminAuthenticated, deleteUser);
router.get('/admin/products', isAdminAuthenticated, getProducts);
router.delete('/admin/product/:id', isAdminAuthenticated, deleteProduct);
router.get('/admin/user-stats', isAdminAuthenticated, getUserStats);
router.get('/admin/product-stats', isAdminAuthenticated, getProductStats);
router.get('/admin/dashboard-stats', isAdminAuthenticated, dashBoardStats);
router.get('/admin/get-users', isAdminAuthenticated, adminGetUsers);
router.get('/admin/vendors', isAdminAuthenticated, getVendors);
router.get('/admin/vendor-stats', isAdminAuthenticated, getVendorStats);
router.get('/admin/get-vendors', isAdminAuthenticated, adminGetVendors);
router.get('/admin/vendor/:id', isAdminAuthenticated, getVendor);
router.get('/admin/vendor/:id/revenue-metrics', isAdminAuthenticated, getVendorRevenueMetrics);
router.get('/admin/vendor/:id/products', isAdminAuthenticated, getVendorProducts);
router.get('/admin/vendor/:id/top-customers', isAdminAuthenticated, getVendorTopCustomers);
router.put('/admin/vendor/:id', isAdminAuthenticated, updateVendor);
router.delete('/admin/vendor/:id', isAdminAuthenticated, deleteVendor);
router.get('/admin/event-managers', isAdminAuthenticated, getEventManagers);
router.get('/admin/event-manager-stats', isAdminAuthenticated, getEventManagerStats);
router.get('/admin/total-events', isAdminAuthenticated, getTotalEvents);
router.get('/admin/event-manager/:id', isAdminAuthenticated, getEventManager);
router.get('/admin/event-manager/:id/metrics', isAdminAuthenticated, getEventManagerMetrics);
router.get('/admin/event-manager/:id/upcoming-events', isAdminAuthenticated, getUpcomingEvents);
router.get('/admin/event-manager/:id/past-events', isAdminAuthenticated, getPastEvents);
router.put('/admin/event-manager/:id', isAdminAuthenticated, updateEventManager);
router.delete('/admin/event-manager/:id', isAdminAuthenticated, deleteEventManager);
router.get('/admin/revenue-chart-data', isAdminAuthenticated, getRevenueChartData);

module.exports = router;