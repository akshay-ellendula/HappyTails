const express = require('express');
const router = express.Router();

const pages = [
    'event_booking_form', 'event_booking', 'event_manager_signup', 'events',
    'home', 'index', 'more_details', 'my_login',
    'my_orders', 'pet_product_details',
    'profile',  'service_provider_login','store_signup',  'shop-analytics',
    'shop-customer-details', 'shop-customers', 'shop-order-details',
    'shop-orders', 'shop-product_form', 'shop-product-edit', 'shop-products', 'shop-profile',
    'admin-dashboard', 'admin-em-details', 'admin-eventManager',
    'admin-products',  'admin-shop-manager',
    'admin-sm-details',  'admin-user-details', 'admin-user', 'admin_login',
    'eventmanager_analytics', 'eventmanager_profile', 'my_events','admin-add-product', 
    'admin-edit-product','eventmanager_event_edit','eventDetails', 'admin-events','event-details',
    'admin-orders','admin-order-details','terms-and-conditions','refund-policy','privacy-policy','cancellation-policy'
];

pages.forEach(page => {
    router.get(`/${page}`, (req, res) => {
        res.render(page, { user: req.session.user || null });
    });
});

module.exports = router;