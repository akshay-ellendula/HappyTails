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
    getRevenueChartData,
    getProduct,
    updateProduct,
    addProduct,
    logout,
    getEventsData,
    deleteEvent,
    getEvent, 
    getEventAttendees,
    updateEvent,
    // Add the missing functions here
    getProductData,
    getProductCustomers,
    getOrders,
    getOrderDetails
} = require('../controllers/adminController');
const { isAdminAuthenticated } = require('../middleware/authMiddleware');

const multer = require('multer');
const path = require('path');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/products'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only JPEG, JPG, and PNG files are allowed'));
    }
});

// --- Authentication and Basic Routes ---
router.post('/admin-login', adminLogin);
router.get('/admin/logout', isAdminAuthenticated, logout);
router.get('/admin-login', (req, res) => {
    res.render('admin_login');
});

// --- Dashboard Stats Routes ---
router.get('/admin/user-stats', isAdminAuthenticated, getUserStats);
router.get('/admin/product-stats', isAdminAuthenticated, getProductStats);
router.get('/admin/dashboard-stats', isAdminAuthenticated, dashBoardStats);
router.get('/admin/revenue-chart-data', isAdminAuthenticated, getRevenueChartData);

// --- User Management Routes ---
router.get('/admin/users', isAdminAuthenticated, getUsers);
router.get('/admin/user/:id', isAdminAuthenticated, getUser);
router.put('/admin/user/:id', isAdminAuthenticated, updateUser);
router.delete('/admin/user/:id', isAdminAuthenticated, deleteUser);
router.get('/admin/get-users', isAdminAuthenticated, adminGetUsers);

// --- Vendor Management Routes ---
router.get('/admin/vendors', isAdminAuthenticated, getVendors);
router.get('/admin/vendor-stats', isAdminAuthenticated, getVendorStats);
router.get('/admin/get-vendors', isAdminAuthenticated, adminGetVendors);
router.get('/admin/vendor/:id', isAdminAuthenticated, getVendor);
router.get('/admin/vendor/:id/revenue-metrics', isAdminAuthenticated, getVendorRevenueMetrics);
router.get('/admin/vendor/:id/products', isAdminAuthenticated, getVendorProducts);
router.get('/admin/vendor/:id/top-customers', isAdminAuthenticated, getVendorTopCustomers);
router.put('/admin/vendor/:id', isAdminAuthenticated, updateVendor);
router.delete('/admin/vendor/:id', isAdminAuthenticated, deleteVendor);

// --- Event Management Routes ---
router.get('/admin/event-managers', isAdminAuthenticated, getEventManagers);
router.get('/admin/event-manager-stats', isAdminAuthenticated, getEventManagerStats);
router.get('/admin/total-events', isAdminAuthenticated, getTotalEvents);
router.get('/admin/event-manager/:id', isAdminAuthenticated, getEventManager);
router.get('/admin/event-manager/:id/metrics', isAdminAuthenticated, getEventManagerMetrics);
router.get('/admin/event-manager/:id/upcoming-events', isAdminAuthenticated, getUpcomingEvents);
router.get('/admin/event-manager/:id/past-events', isAdminAuthenticated, getPastEvents);
router.put('/admin/event-manager/:id', isAdminAuthenticated, updateEventManager);
router.delete('/admin/event-manager/:id', isAdminAuthenticated, deleteEventManager);
router.get('/admin/events', isAdminAuthenticated, getEventsData);
router.delete('/admin/events/:id', isAdminAuthenticated, deleteEvent);
router.put('/admin/event/:id', isAdminAuthenticated, updateEvent);
router.get('/admin/event/:id', isAdminAuthenticated, getEvent);
router.get('/admin/event/:id/attendees', isAdminAuthenticated, getEventAttendees);

// --- Product Management Routes ---
router.get('/admin/products', isAdminAuthenticated, getProducts);
router.post('/admin/add-product', isAdminAuthenticated, upload.array('productImages', 4), addProduct);
router.post('/admin/product/:id', isAdminAuthenticated, upload.array('productImages', 4), updateProduct);
router.delete('/admin/product/:id', isAdminAuthenticated, deleteProduct);
router.get('/admin/product/:id', isAdminAuthenticated, getProduct); // API route to get single product data

// --- Page Rendering Routes ---
router.get('/admin-add-product', isAdminAuthenticated, (req, res) => {
    res.render('admin-add-product', {
        categories: ['beds', 'food', 'toys', 'grooming', 'other'],
        petTypes: ['dog', 'cat', 'bird', 'fish', 'all']
    });
});

router.get('/admin-edit-product', isAdminAuthenticated, (req, res) => {
    res.render('admin-edit-product');
});

router.get('/admin-em-details', isAdminAuthenticated, (req, res) => {
    res.render('admin-em-details');
});

router.get('/admin-event-details', isAdminAuthenticated, (req, res) => {
    res.render('admin-event-details');
});

// Route to render the dynamic product details page
router.get('/admin-product-details/:id', isAdminAuthenticated, async (req, res) => {
    try {
        const productData = await getProductData(req.params.id);
        const customersData = await getProductCustomers(req.params.id);

        res.render('admin-product-details', {
            product: productData,
            customers: customersData
        });
    } catch (err) {
        console.error('Error fetching data for product details page:', err);
        res.status(500).render('admin-product-details', { product: null, customers: null });
    }
});

// --- New Order Management Routes ---
router.get('/api/admin/orders', isAdminAuthenticated, getOrders);
router.get('/api/admin/order/:id', isAdminAuthenticated, getOrderDetails);

// --- New Page Rendering Routes ---
router.get('/admin-orders', isAdminAuthenticated, (req, res) => {
    res.render('admin-orders');
});

router.get('/admin-order-details/:id', isAdminAuthenticated, (req, res) => {
    res.render('admin-order-details');
});

module.exports = router;