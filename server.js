// app.js
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
const eventManagerRoutes = require('./routes/eventManagerRoutes'); // Add this line
const staticRoutes = require('./routes/staticRoutes');

const app = express();

// Middleware setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Create product upload directory
const productUploadDir = path.join(__dirname, 'uploads', 'products');
if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true });
}
app.use('/uploads', express.static('uploads'));

// Mount routes
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', vendorRoutes);
app.use('/', productRoutes);
app.use('/', adminRoutes);
app.use('/', eventManagerRoutes); // Add this line
app.use('/', staticRoutes);


// Initialize database and start server
function initializeDatabase() {
    createTables(() => {
        insertSampleData(() => {
            app.listen(3000, () => {
                console.log('Server is running on port 3000');
                console.log('http://localhost:3000/pet_accessory');
                console.log('http://localhost:3000/home');
                console.log('http://localhost:3000/service_provider_login');
                console.log('http://localhost:3000/event_manager_signup'); // Add this for reference
            });
        });
    });
}

initializeDatabase();