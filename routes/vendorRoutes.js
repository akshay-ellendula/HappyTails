const express = require('express');
const router = express.Router();
const { storeSignup, serviceProviderLogin, getVendorDashboard, logout, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct } = require('../controllers/vendorController');
const { db } = require('../models/database');

router.get('/service_provider_login', (req, res) => {
    res.render('service_provider_login');
});

router.get('/shop-dashboard/:storeName', getVendorDashboard);
router.get('/shop-profile', getVendorProfile);
router.get('/shop-products', getVendorProducts);

router.get('/shop-product-form', async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }
    try {
        const categoriesQuery = `SELECT DISTINCT product_category FROM products`;
        const categories = await new Promise((resolve, reject) => {
            db.all(categoriesQuery, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => row.product_category));
            });
        });
        const petTypesQuery = `SELECT DISTINCT product_type FROM products`;
        const petTypes = await new Promise((resolve, reject) => {
            db.all(petTypesQuery, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => row.product_type));
            });
        });
        res.render('shop-product-form', {
            vendor: req.session.vendor,
            categories: categories.length > 0 ? categories : ['beds', 'toys', 'grooming', 'food'],
            petTypes: petTypes.length > 0 ? petTypes : ['dog', 'cat', 'all']
        });
    } catch (error) {
        console.error('Error fetching categories and pet types:', error);
        res.status(500).send('Server error');
    }
});

router.get('/shop-product-edit/:productId', getProductForEdit);
router.post('/shop-product-edit/:productId', updateProduct);
router.post('/submit-product', submitProduct);
router.get('/shop-orders', getVendorOrders);
router.get('/shop-customers', getVendorCustomers);
router.post('/store-signup', storeSignup);
router.post('/service_provider_login', serviceProviderLogin); // Unified route
router.get('/logout', logout);

module.exports = router;