// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { getPetAccessories, submitProduct, getVendorProducts, getProduct, updateProduct, deleteProduct, deleteProductImage } = require('../controllers/productController');
const { isVendorAuthenticated } = require('../middleware/authMiddleware');

router.get('/pet_accessory', getPetAccessories);
router.post('/submit-product', isVendorAuthenticated, submitProduct);
router.get('/vendor/products', isVendorAuthenticated, getVendorProducts);
router.get('/product/:id', getProduct);
router.put('/product/:id', isVendorAuthenticated, updateProduct);
router.delete('/product/:id', isVendorAuthenticated, deleteProduct);
router.delete('/product-image/:id', isVendorAuthenticated, deleteProductImage);

module.exports = router;