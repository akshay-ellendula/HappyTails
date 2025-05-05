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
    reorder             
} = require('../controllers/productController');
const { isVendorAuthenticated, isUserAuthenticated } = require('../middleware/authMiddleware');

// Existing routes
router.get('/pet_accessory', getPetAccessories);
router.post('/submit-product', isVendorAuthenticated, submitProduct);
router.get('/vendor/products', isVendorAuthenticated, getVendorProducts);
router.get('/product/:id', getProduct);
router.put('/product/:id', isVendorAuthenticated, updateProduct);
router.delete('/product/:id', isVendorAuthenticated, deleteProduct);
router.delete('/product-image/:id', isVendorAuthenticated, deleteProductImage);

// New routes with user authentication
router.post('/checkout', isUserAuthenticated, checkout);
router.get('/api/my_orders', isUserAuthenticated, getUserOrders);
router.post('/api/orders/:orderId/reorder', isUserAuthenticated, reorder);

module.exports = router;