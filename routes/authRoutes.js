// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { signup, login, logout } = require('../controllers/authController');
const { serviceProviderLogin } = require('../controllers/serviceProviderController');

router.post('/service_provider_login', serviceProviderLogin);


router.post('/signup', signup);
router.post('/login', login);
router.get('/logout', logout);

module.exports = router;