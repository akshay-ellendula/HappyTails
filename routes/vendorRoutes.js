// routes/vendorRoutes.js
const express = require('express');
const router = express.Router();
const { storeSignup } = require('../controllers/vendorController');
const { serviceProviderLogin } = require('../controllers/serviceProviderController');

router.post('/store-signup', storeSignup);
router.post('/service-provider-login', serviceProviderLogin);

module.exports = router;