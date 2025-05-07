const express = require('express');
const router = express.Router();
const providerLoginController = require('../controllers/providerLoginController'); // Adjust path to your controller

// Route to render the provider login page
router.get('/service_provider_login', providerLoginController.renderLoginPage);

// Route to handle provider login form submission
router.post('/service_provider_login', providerLoginController.loginProvider);

// Dashboard routes
router.get('/eventmanager_dashboard', providerLoginController.renderEventManagerDashboard);
router.get('/shop-dashboard', providerLoginController.renderStoreManagerDashboard);

module.exports = router;
