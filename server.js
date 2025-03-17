const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: true,
    })
);

// Initialize SQLite database
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to SQLite database');
});

// Create users table
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT NOT NULL,
        user_email TEXT UNIQUE NOT NULL,
        user_password TEXT NOT NULL,
        user_phone TEXT DEFAULT NULL,
        user_address TEXT DEFAULT NULL,
        profile_pic TEXT DEFAULT NULL
    )
`, (err) => {
    if (err) console.error('Error creating table:', err);
});

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Routes for static pages
const pages = [
    'blog', 'event_booking_form', 'event_booking', 'event_manager_signup', 'events',
    'home', 'index', 'more_details', 'my_blogs', 'my_login',
    'my_orders', 'my_pets', 'pet_accessory', 'pet_adoption', 'pet_product_details',
    'profile', 'service_analytics', 'service_animal_details', 'service_dashbord',
    'service_details', 'service_history', 'service_profile', 'service_provider_login',
    'service_login', 'services', 'store_signup', 'track_package'
];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(page, { user: req.session.user || null });
    });
});

// Signup route
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

// Login route
app.post('/login', (req, res) => {
    const { user_email, user_password } = req.body;

    db.get("SELECT * FROM users WHERE user_email = ?", [user_email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(user_password, user.user_password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        req.session.user = user; // Set the session
        res.status(200).json({ success: true, redirect: '/home' });
    });
});

// Update profile route
app.post("/update-profile", upload.single("profilePic"), (req, res) => {

    console.log("Uploaded file:", req.file);
    
    const { user_name, user_phone, user_address } = req.body; // Exclude user_email
    const user_email = req.session.user.user_email; // Use email from the session
    

    let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Build the query dynamically based on provided fields
    let query = "UPDATE users SET ";
    const values = [];
    const updates = [];

    if (user_name) {
        updates.push("user_name=?");
        values.push(user_name);
    }
    if (user_phone) {
        updates.push("user_phone=?");
        values.push(user_phone);
    }
    if (user_address) {
        updates.push("user_address=?");
        values.push(user_address);
    }
    if (imageUrl) {
        updates.push("profile_pic=?");
        values.push(imageUrl);
    }

    // If no fields are provided, return an error
    if (updates.length === 0) {
        return res.status(400).json({ success: false, error: "No fields to update" });
    }

    query += updates.join(", ") + " WHERE user_email=?";
    values.push(user_email);

    db.run(query, values, (err) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ success: false, error: "Database update failed" });
        }

        // Update the session with the new user data
        if (user_name) req.session.user.user_name = user_name;
        if (user_phone) req.session.user.user_phone = user_phone;
        if (user_address) req.session.user.user_address = user_address;
        if (imageUrl) req.session.user.profile_pic = imageUrl;

        res.json({ success: true });
    });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/home');
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('http://localhost:3000/home');
});
//