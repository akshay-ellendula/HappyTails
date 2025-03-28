const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { db, createTables, insertSampleData } = require('./models/database');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const eventManagerRoutes = require('./routes/eventManagerRoutes');
const staticRoutes = require('./routes/staticRoutes');

const app = express();

// Middleware setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secure-secret-key-here-12345', // Updated to a more secure value
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS in production
}));

// Create product upload directory
const productUploadDir = path.join(__dirname, 'public', 'uploads', 'products');
if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Mount routes (order matters)
app.use('/', vendorRoutes);         // Handles /service_provider_login first
app.use('/', eventManagerRoutes);   // Handles Event Manager-specific routes
app.use('/', authRoutes);           // User authentication routes
app.use('/', userRoutes);           // User-specific routes
app.use('/', productRoutes);        // Product-related routes
app.use('/', adminRoutes);          // Admin routes
app.use('/', staticRoutes);         // Static routes last

// Initialize database and start server
function initializeDatabase() {
    createTables(() => {
        insertSampleData(() => {
            app.listen(3000, () => {
                console.log('Server is running on port 3000');
                console.log('http://localhost:3000/pet_accessory');
                console.log('http://localhost:3000/home');
                console.log('http://localhost:3000/service_provider_login');
                console.log('http://localhost:3000/event_manager_signup');
            });
        });
    });
}

initializeDatabase();