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
        cookie: { secure: false } // Set to true if using HTTPS
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
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
app.use('/uploads', express.static('uploads'));

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Please log in first' });
    }
};

// Routes for static pages
const pages = [
    'blog', 'event_booking_form', 'event_booking', 'event_manager_signup', 'events',
    'home', 'index', 'more_details', 'my_blogs', 'my_login',
    'my_orders', 'my_pets', 'pet_accessory', 'pet_adoption', 'pet_product_details',
    'profile', 'service_analytics', 'service_animal_details', 'service_dashbord',
    'service_details', 'service_history', 'service_profile', 'service_provider_login',
    'service_signup', 'services', 'store_signup', 'track_package','shop-analytics',
    'shop-customer-details','shop-customers','shop-dashboard','shop-order-details',
    'shop-orders','shop-product_form','shop-product-edit','shop-products','shop-profile',
    'admin-appointments','admin-dashboard','admin-em-details','admin-events',
    'admin-product-details','admin-products','admin-service-provider','admin-shop-manager',
    'admin-sm-details','admin-sp-details','admin-user-details','admin-user'


];

pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(page, { user: req.session.user || null });
    });
});

// Signup route
app.post('/signup', async (req, res) => {
    const { user_name, user_email, user_password } = req.body;

    // Server-side validation
    if (!user_name || !user_email || !user_password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (user_password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    try {
        // Check if user already exists
        db.get("SELECT * FROM users WHERE user_email = ?", [user_email], async (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            if (row) {
                return res.status(400).json({ success: false, message: 'Email already registered' });
            }

            // Hash password and insert user
            const hashedPassword = await bcrypt.hash(user_password, 10);
            db.run(
                "INSERT INTO users (user_name, user_email, user_password) VALUES (?, ?, ?)",
                [user_name, user_email, hashedPassword],
                function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ success: false, message: 'Database error' });
                    }
                    console.log('User registered:', { user_name, user_email });
                    res.status(201).json({ success: true, message: 'Signup successful' });
                }
            );
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { user_email, user_password } = req.body;

    // Server-side validation
    if (!user_email || !user_password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        db.get("SELECT * FROM users WHERE user_email = ?", [user_email], async (err, user) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }

            const isMatch = await bcrypt.compare(user_password, user.user_password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid email or password' });
            }

            req.session.user = {
                id: user.id,
                user_name: user.user_name,
                user_email: user.user_email,
                user_phone: user.user_phone,
                user_address: user.user_address,
                profile_pic: user.profile_pic
            };
            res.status(200).json({ success: true, redirect: '/home', message: 'Login successful' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update profile route
app.post("/update-profile", isAuthenticated, upload.single("profilePic"), async (req, res) => {
    try {
        const { user_name, user_phone, user_address } = req.body;
        const user_email = req.session.user.user_email;

        // Validation
        if (!user_name && !user_phone && !user_address && !req.file) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }
        if (user_name && user_name.length < 2) {
            return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
        }

        let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        // Build dynamic query
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

        query += updates.join(", ") + " WHERE user_email=?";
        values.push(user_email);

        db.run(query, values, function (err) {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ success: false, message: "Database update failed" });
            }

            // Update session
            if (user_name) req.session.user.user_name = user_name;
            if (user_phone) req.session.user.user_phone = user_phone;
            if (user_address) req.session.user.user_address = user_address;
            if (imageUrl) req.session.user.profile_pic = imageUrl;

            res.json({ success: true, message: 'Profile updated successfully' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true, redirect: '/home' });
    });
});

// Get current user info
app.get('/user-info', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: 'Not logged in' });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
    console.log('http://localhost:3000/home');
    console.log('http://localhost:3000/service_provider_login');
    console.log('http://localhost:3000/shop-dashboard');
    console.log('http://localhost:3000/admin-dashboard');
});