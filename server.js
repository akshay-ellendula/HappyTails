const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./models/database');
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
    store: MongoStore.create({
        mongoUrl: 'mongodb+srv://vedaprakash8341:bmfk3zoZflpB8k9L@cluster0.jykgpnw.mongodb.net/happytails',
        collectionName: 'sessions'
    }),
    cookie: { secure: false }
}));

// Middleware to validate checkout session
const validateCheckoutSession = (req, res, next) => {
    if (req.path === '/payment') {
        if (!req.session.cart || !req.session.orderTotals) {
            console.log('Invalid session - redirecting to pet accessories');
            return res.redirect('/pet_accessory');
        }
    }
    next();
};

// Use this middleware in your app (add this line after your session middleware)
app.use(validateCheckoutSession);

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