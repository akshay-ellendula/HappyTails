// routes/vendorRoutes.js
const express = require('express');
const router = express.Router();
const { storeSignup, serviceProviderLogin } = require('../controllers/vendorController');

router.post('/store-signup', storeSignup);
router.post('/service-provider-login', serviceProviderLogin);

module.exports = router;