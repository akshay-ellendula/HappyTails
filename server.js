const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

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
    secret: 'your-secure-secret-key-here-12345', // Hardcoded session secret
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

// Load and connect to MongoDB
const { connectToMongo } = require('./models/database');
connectToMongo()
    .then(() => {
        console.log('MongoDB connection established successfully');
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    });

// Mount routes (order matters)
app.use('/', vendorRoutes);
app.use('/', eventManagerRoutes);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', productRoutes);
app.use('/', adminRoutes);
app.use('/', staticRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
const PORT = 3000; // Hardcoded port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/pet_accessory`);
    console.log(`http://localhost:${PORT}/home`);
    console.log(`http://localhost:${PORT}/service_provider_login`);
    console.log(`http://localhost:${PORT}/event_manager_signup`);
});