const express = require('express');
const session = require("express-session");


const app = express();



app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

const users = [];


app.use(
    session({
        secret: "secret",
        resave: false,
        saveUninitialized: true,
    })
);

const pages = [
    'blog', 'event_manager_signup', 'Events', 'home', 'index', 
    'login_signup', 'more-details', 'myblogs_profile', 'myorders_profile', 
    'mypets_profile', 'pet_accessory', 'pet_adoption', 'pet_product_details',
    'profile', 'service_login', 'services', 'store_signup', 'track_package',
    'Event-booking-form','Event-booking'
];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(page, { user: req.session.user || null });
    });
});



app.post("/signup", (req, res) => {
    const { user_name, user_email, user_password } = req.body;

    // Check if user already exists
    if (users.some(user => user.user_email === user_email)) {
        return res.status(400).json({ message: "User already exists" });
    }

    // Store user temporarily
    users.push({ user_name, user_email, user_password });
    console.log("User registered:", { user_name, user_email });

    res.status(201).json({ message: "Signup successful" });
});

// Login route
app.post("/login", (req, res) => {
    const { user_email, user_password } = req.body;

    // Find user
    const user = users.find(user => user.user_email === user_email && user.user_password === user_password);

    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.user = user;

    res.status(200).json({ success: true, redirect: "/home"});
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/home");
    });
});



app.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('http://localhost:3000');
});