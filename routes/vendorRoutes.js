// routes/vendorRoutes.js
const express = require('express');
const router = express.Router();
const { storeSignup } = require('../controllers/vendorController');
const { serviceProviderLogin } = require('../controllers/serviceProviderController');

// Vendor signup route
router.post('/store-signup', storeSignup);

// Service provider login route (for both vendors and event managers)
router.post('/service-provider-login', serviceProviderLogin);

module.exports = router;