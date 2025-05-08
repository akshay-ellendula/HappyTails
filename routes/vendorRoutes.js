const express = require('express');
const router = express.Router();
const { Product } = require('../models/database');
const { storeSignup, serviceProviderLogin, getVendorDashboard,getVendorAnalytics, logout, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct, getOrderDetails,deleteOrder,getCustomerDetails,deleteSelectedOrders } = require('../controllers/vendorController');

router.get('/service_provider_login', (req, res) => {
    res.render('service_provider_login');
});

router.get('/shop-dashboard/:storeName', (req, res, next) => {
    console.log('Dashboard route accessed:', { storeName: req.params.storeName, session: req.session.vendor });
    getVendorDashboard(req, res, next);
});

// New route for order details
router.get('/shop-order-details/:orderId',getOrderDetails);
router.get('/shop-customer-details', getCustomerDetails);

router.delete('/delete-order/:orderId', deleteOrder);
router.delete('/delete-selected-orders', deleteSelectedOrders);

router.get('/shop-profile', getVendorProfile);
router.get('/shop-products', getVendorProducts);

router.get('/shop-product-form', async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }
    try {
        const categories = await Product.distinct('product_category');
        const petTypes = await Product.distinct('product_type');

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

// Assuming you already have 'Order' and 'OrderItem' models available
router.get('/shop-order-details/:orderId', async (req, res) => {
    const { orderId } = req.params;  // Get the order ID from the URL parameter

    try {
        // Fetch the order by ID
        const order = await Order.findById(orderId).lean();
        
        // Fetch the associated order items for this order
        const orderItems = await OrderItem.find({ order_id: orderId })
            .populate('variant_id')  // Populate variant details
            .populate('product_id');  // Populate product details

        // Render the order details page with the order and its items
        res.render('shop-order-details', {
            order,
            items: orderItems
        });
    } catch (error) {
        console.error('Error loading order details:', error);
        res.status(500).send('Server error');
    }
});

router.get('/shop-analytics', getVendorAnalytics);


router.get('/shop-product-edit/:productId', getProductForEdit);
router.post('/shop-product-edit/:productId', updateProduct);
router.post('/submit-product', submitProduct);
router.get('/shop-orders', getVendorOrders);
router.get('/shop-customers', getVendorCustomers);
router.post('/store-signup', storeSignup);
router.post('/service_provider_login', serviceProviderLogin);
router.get('/logout', logout);

module.exports = router;