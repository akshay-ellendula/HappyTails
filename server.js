const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./models/database'); // Import the initializeDatabase function
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
    secret: 'your-secure-secret-key-here-12345',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Create product upload directory
const productUploadDir = path.join(__dirname, 'public', 'uploads', 'products');
if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Mount routes (order matters)
app.use('/', vendorRoutes);
app.use('/', eventManagerRoutes);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', productRoutes);
app.use('/', adminRoutes);
app.use('/', staticRoutes);

// Start server after database initialization
const startServer = () => {
    app.listen(3000, () => {
        console.log('Server is running on port 3000');
        console.log('http://localhost:3000/pet_accessory');
        console.log('http://localhost:3000/home');
        console.log('http://localhost:3000/service_provider_login');
        console.log('http://localhost:3000/event_manager_signup');
    });
};

// Initialize the database and start the server
initializeDatabase(startServer);