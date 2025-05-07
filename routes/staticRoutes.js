const express = require('express');
const router = express.Router();

const pages = [
    'blog', 'event_booking_form', 'event_booking', 'event_manager_signup', 'events',
    'home', 'index', 'more_details', 'my_blogs', 'my_login',
    'my_orders', 'my_pets', 'pet_adoption', 'pet_product_details',
    'profile', 'service_analytics', 'service_animal_details', 'service_dashbord',
    'service_details', 'service_history', 'service_profile', 'service_provider_login',
    'service_signup', 'services', 'store_signup', 'track_package', 'shop-analytics',
    'shop-customer-details', 'shop-customers', 'shop-order-details',
    'shop-orders', 'shop-product_form', 'shop-product-edit', 'shop-products', 'shop-profile',
    'admin-appointments', 'admin-dashboard', 'admin-em-details', 'admin-events',
    'admin-product-details', 'admin-products', 'admin-service-provider', 'admin-shop-manager',
    'admin-sm-details', 'admin-sp-details', 'admin-user-details', 'admin-user', 'admin_login',
    'eventmanager_analytics', 'eventmanager_profile', 'my_events'
];

pages.forEach(page => {
    router.get(`/${page}`, (req, res) => {
        res.render(page, { user: req.session.user || null });
    });
});

module.exports = router;