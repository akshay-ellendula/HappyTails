// routes/vendorRoutes.js
const express = require('express');
const router = express.Router();
const { storeSignup, serviceProviderLogin, getVendorDashboard, logout, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers } = require('../controllers/vendorController');

// Route to render the login page
router.get('/service_provider_login', (req, res) => {
    res.render('service_provider_login');
});

// Dynamic route for vendor dashboard
router.get('/shop-dashboard/:storeName', getVendorDashboard);

// Route for vendor profile
router.get('/shop-profile', getVendorProfile);

// Route for vendor products
router.get('/shop-products', getVendorProducts);

// Route to fetch product data for editing
router.get('/shop-product-edit/:productId', getProductForEdit);

// Route to update product
router.post('/shop-product-edit/:productId', updateProduct);

// Route for vendor orders
router.get('/shop-orders', getVendorOrders);

// Route for vendor customers
router.get('/shop-customers', getVendorCustomers);

// Vendor signup route
router.post('/store-signup', storeSignup);

// Service provider login route (for both vendors and event managers)
router.post('/service-provider-login', serviceProviderLogin);
router.get('/logout', logout);

module.exports = router;