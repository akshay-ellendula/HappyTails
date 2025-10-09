const express = require('express');
const router = express.Router();
const { 
    getPetAccessories, 
    submitProduct, 
    getVendorProducts, 
    getProduct, 
    updateProduct, 
    deleteProduct, 
    deleteProductImage, 
    checkout,           
    getUserOrders,
    processPayment,   
    reorder,
    getPaymentPage           
} = require('../controllers/productController');
const { isVendorAuthenticated, isUserAuthenticated } = require('../middleware/authMiddleware');

// Existing routes
router.get('/pet_accessory', getPetAccessories);


router.get('/product/:id', getProduct);




// New routes with user authentication
router.post('/checkout', isUserAuthenticated, checkout);
router.post('/process-payment', isUserAuthenticated, processPayment);
router.get('/payment', getPaymentPage);
router.get('/api/my_orders', isUserAuthenticated, getUserOrders);
router.post('/api/orders/:orderId/reorder', isUserAuthenticated, reorder);

module.exports = router;