const express = require('express');

const app = express();


app.set('view engine', 'ejs');
app.use(express.static('public'));

const pages = [
    'blog', 'event_manager_signup', 'Events', 'home', 'index', 
    'login_signup', 'more-details', 'myblogs_profile', 'myorders_profile', 
    'mypets_profile', 'pet_accessory', 'pet_adoption', 'pet_product_details',
    'profile', 'service_login', 'services', 'store_signup', 'track_package'
];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(page);
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});