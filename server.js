const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');


const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const users = [];

app.use(
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: true,
    })
);

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to SQLite database');
});


db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT NOT NULL,
        user_email TEXT UNIQUE NOT NULL,
        user_password TEXT NOT NULL,
        user_phone TEXT NOT NULL,
        user_address TEXT NOT NULL,
        profile_pic TEXT DEFAULT NULL
    )
`, (err) => {
    if (err) console.error('Error creating table:', err);
});

// Updated pages array to match current EJS filenames
const pages = [
    'blog', 'event_booking_form', 'event_booking', 'event_manager_signup', 'events',
    'home', 'index', 'more_details', 'my_blogs', 'my_login',
    'my_orders', 'my_pets', 'pet_accessory', 'pet_adoption', 'pet_product_details',
    'profile', 'service_analytics', 'service_animal_details', 'service_dashbord',
    'service_details', 'service_history', 'service_profile', 'service_provider_login',
    'service_signup', 'services', 'store_signup', 'track_package'
];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(page, { user: req.session.user || null });
    });
});

app.post('/signup', (req, res) => {
    const { user_name, user_email, user_password } = req.body;

    // Check if user already exists
    db.get("SELECT * FROM users WHERE user_email = ?", [user_email], async (err, row) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (row) return res.status(400).json({ message: 'User already exists' });

        // Hash the password and insert the user
        const hashedPassword = await bcrypt.hash(user_password, 10);
        db.run("INSERT INTO users (user_name, user_email, user_password) VALUES (?, ?, ?)", 
            [user_name, user_email, hashedPassword], 
            function (err) {
                if (err) return res.status(500).json({ message: 'Database error' });

                console.log('User registered:', { user_name, user_email });
                res.status(201).json({ message: 'Signup successful' });
            }
        );
    });
});

app.post('/login', (req, res) => {
    const { user_email, user_password } = req.body;

    db.get("SELECT * FROM users WHERE user_email = ?", [user_email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(user_password, user.user_password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        req.session.user = user;
        res.status(200).json({ success: true, redirect: '/home' });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/home');
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('http://localhost:3000/home');
});