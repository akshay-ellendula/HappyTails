// routes/vendorRoutes.js
const express = require('express');
const router = express.Router();
const { storeSignup, serviceProviderLogin, getVendorDashboard, logout, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct } = require('../controllers/vendorController');
const { db } = require('../models/database'); // Import the database

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

// Route to render the "Add New Product" form
router.get('/shop-product-form', async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    try {
        // Fetch unique categories from the products table
        const categoriesQuery = `SELECT DISTINCT product_category FROM products`;
        const categories = await new Promise((resolve, reject) => {
            db.all(categoriesQuery, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => row.product_category));
            });
        });

        // Fetch unique pet types from the products table
        const petTypesQuery = `SELECT DISTINCT product_type FROM products`;
        const petTypes = await new Promise((resolve, reject) => {
            db.all(petTypesQuery, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => row.product_type));
            });
        }); // Removed the extra parenthesis

        res.render('shop-product-form', {
            vendor: req.session.vendor,
            categories: categories.length > 0 ? categories : ['beds', 'toys', 'grooming', 'food'], // Fallback if no categories exist
            petTypes: petTypes.length > 0 ? petTypes : ['dog', 'cat', 'all'] // Fallback if no pet types exist
        });
    } catch (error) {
        console.error('Error fetching categories and pet types:', error);
        res.status(500).send('Server error');
    }
});

// Route to fetch product data for editing
router.get('/shop-product-edit/:productId', getProductForEdit);

// Route to update product
router.post('/shop-product-edit/:productId', updateProduct);

// Route to submit a new product
router.post('/submit-product', submitProduct);

// Route for vendor orders
router.get('/shop-orders', getVendorOrders);

// Route for vendor customers
router.get('/shop-customers', getVendorCustomers);

// Vendor signup route
router.post('/store-signup', storeSignup);

// Service provider login route (for both vendors and event managers)
router.post('/service-provider-login', serviceProviderLogin);

// Logout route
router.get('/logout', logout);

module.exports = router;