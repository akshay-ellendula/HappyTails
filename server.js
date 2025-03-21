const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Initialize SQLite database
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Function to initialize database tables
function createTables(callback) {
    db.serialize(() => {
        // Create users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_name TEXT NOT NULL,
                user_email TEXT UNIQUE NOT NULL,
                user_password TEXT NOT NULL,
                user_phone TEXT DEFAULT NULL,
                user_address TEXT DEFAULT NULL,
                profile_pic TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating users table:', err);
            else console.log('Users table created successfully');
        });

        // Create vendors table
        db.run(`
            CREATE TABLE IF NOT EXISTS vendors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact_number TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                store_name TEXT NOT NULL,
                store_location TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error('Error creating vendors table:', err);
            else console.log('Vendors table created successfully');
        });
        // Create products table
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                product_category TEXT NOT NULL,
                product_type TEXT NOT NULL,
                product_description TEXT NOT NULL,
                regular_price REAL NOT NULL,
                sale_price REAL,
                sku TEXT,
                stock_quantity INTEGER NOT NULL,
                stock_status TEXT NOT NULL,
                color TEXT,
                size TEXT,
                material TEXT,
                weight REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id)
            )
        `, (err) => {
            if (err) console.error('Error creating products table:', err);
            else console.log('Products table created successfully');
        });
        // Create product_images table
        db.run(`
            CREATE TABLE IF NOT EXISTS product_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                is_primary BOOLEAN DEFAULT 0,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `, (err) => {
            if (err) console.error('Error creating product_images table:', err);
            else console.log('Product_images table created successfully');
            callback(); // All tables created, proceed to next step
        });
    });
}

// Function to insert sample data
function insertSampleData(callback) {
    const queries = [

        // Insert users
        `INSERT INTO users (user_name, user_email, user_password) VALUES 
         ('Gautam Thota', 'gautam.thota@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W')`,
        `INSERT INTO users (user_name, user_email, user_password) VALUES 
         ('Veda Prakash', 'veda.prakash@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W')`,
        `INSERT INTO users (user_name, user_email, user_password) VALUES 
         ('Akshay', 'akshay@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W')`,


        // Insert vendors 
        `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES 
         ('Gautam Thota', '9876543210', 'gautam.thota@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Pet Haven', 'Vijayawada')`,
        `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES 
         ('Veda Prakash', '8765432109', 'veda.prakash@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Furry Friends', 'Hyderabad')`,
        `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES 
         ('Akshay', '7654321098', 'akshay@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Paws & Claws', 'Bangalore')`,

        // Insert products
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sale_price, sku, stock_quantity, stock_status, color, size, material, weight) VALUES 
         (1, 'Cozy Pet Bed', 'Accessories', 'Pet Beds', 'Soft and cozy bed for pets', 2999.99, 2499.99, 'PB001', 20, 'In Stock', 'Brown', 'Medium', 'Cotton', 2.5)`,
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sku, stock_quantity, stock_status, size, weight) VALUES 
         (1, 'Chicken-Flavored Dog Food', 'Pet Food', 'Dry', 'Nutritious dog food for all breeds', 1499.99, 'DF001', 50, 'In Stock', 'Large', 5.0)`, // Fixed
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sale_price, sku, stock_quantity, stock_status, color, size, material, weight) VALUES 
         (2, 'Cat Scratching Post', 'Accessories', 'Furniture', 'Durable scratching post for cats', 1999.99, 1799.99, 'SP001', 15, 'In Stock', 'Grey', 'Large', 'Sisal/Wood', 3.0)`,
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sku, stock_quantity, stock_status, size, weight) VALUES 
         (2, 'Fish-Flavored Treats', 'Pet Food', 'Treats', 'Delicious treats for cats', 499.99, 'FT001', 100, 'In Stock', 'Small', 0.25)`, // Fixed
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sale_price, sku, stock_quantity, stock_status, color, size, material, weight) VALUES 
         (3, 'Grooming Brush', 'Grooming', 'Grooming Supplies', 'Gentle brush for pet grooming', 799.99, 699.99, 'GB001', 30, 'In Stock', 'Blue', 'Medium', 'Plastic', 0.2)`,
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sale_price, sku, stock_quantity, stock_status, color, size, material, weight) VALUES 
         (3, 'Pet Carrier', 'Accessories', 'Carrier', 'Portable carrier for small pets', 3999.99, 3499.99, 'PC001', 10, 'In Stock', 'Grey', 'Medium', 'Plastic/Fabric', 2.0)`,

        // Insert product images 
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
         (1, 'https://m.media-amazon.com/images/I/71bQdtBbRdL._SX679_.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
         (1, '/images/cat in cat cave, to advertise the cat cave with a plane grey background, a little bigger.jpg', 0)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
         (2, '/images/cat in cat cave, to advertise the cat cave with a plane grey background, a little bigger.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
         (3, 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcTNMDBsUPAhQpb1c3mb-qIWpIyt9YNARqL7_GpFISTsRVGvswjVZVIc5iZkRORLE-bW5ycbK7pdf5eAgxwxG_gtADerjtyJCPFEV-2OF92MdZgb71yVcCAmaQ', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
         (4, 'https://m.media-amazon.com/images/I/71bQdtBbRdL._SX679_.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
         (5, '/images/cat in cat cave, to advertise the cat cave with a plane grey background, a little bigger.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
         (6, '/images/cat in cat cave, to advertise the cat cave with a plane grey background, a little bigger.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
         (6, '/images/cat in cat cave, to advertise the cat cave with a plane grey background, a little bigger.jpg', 0)`
    ];

    let completedQueries = 0;
    const totalQueries = queries.length;

    queries.forEach((query, index) => {
        db.run(query, (err) => {
            if (err) {
                console.error(`Error inserting data at step ${index + 1}:`, err.message);
            } else {
                console.log(`Inserted data at step ${index + 1} successfully`);
            }
            completedQueries++;
            if (completedQueries === totalQueries) {
                callback();
            }
        });
    });
}

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

const productImageStorage = multer.diskStorage({
    destination: 'uploads/products/',
    filename: (req, file, cb) => {
        cb(null, `product_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const uploadProductImages = multer({
    storage: productImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
}).array('product-images', 10);

// Create product upload directory
const productUploadDir = path.join(__dirname, 'uploads', 'products');
if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true });
}

// Middleware for authentication
const isVendorAuthenticated = (req, res, next) => {
    if (req.session.vendor) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Vendor access required' });
    }
};

// Routes
app.get('/pet_accessory', (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;

    db.all(`
        SELECT p.id, p.product_name, p.product_type, p.regular_price, p.sale_price, 
               p.color, p.size, p.weight, pi.image_path
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
        ORDER BY p.created_at DESC
    `, [], (err, products) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).send('Server error');
        }

        console.log('Products fetched:', products);
        res.render('pet_accessory', {
            user: req.session.user || null,
            products: products || []
        });
    });
});

// Static pages
const pages = [
    'blog', 'event_booking_form', 'event_booking', 'event_manager_signup', 'events',
    'home', 'index', 'more_details', 'my_blogs', 'my_login',
    'my_orders', 'my_pets', 'pet_accessory', 'pet_adoption', 'pet_product_details',
    'profile', 'service_analytics', 'service_animal_details', 'service_dashbord',
    'service_details', 'service_history', 'service_profile', 'service_provider_login',
    'service_signup', 'services', 'store_signup', 'track_package', 'shop-analytics',
    'shop-customer-details', 'shop-customers', 'shop-dashboard', 'shop-order-details',
    'shop-orders', 'shop-product_form', 'shop-product-edit', 'shop-products', 'shop-profile',
    'admin-appointments', 'admin-dashboard', 'admin-em-details', 'admin-events',
    'admin-product-details', 'admin-products', 'admin-service-provider', 'admin-shop-manager',
    'admin-sm-details', 'admin-sp-details', 'admin-user-details', 'admin-user', 'admin_login',
    'eventmanager_dashboard', 'eventmanager_analytics', 'eventmanager_events', 'eventmanager_profile',
    'eventmanager_attendees'
];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.render(page, { user: req.session.user || null });
    });
});

// Signup route
app.post('/signup', async (req, res) => {
    const { user_name, user_email, user_password } = req.body;
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
        db.get("SELECT * FROM users WHERE user_email = ?", [user_email], async (err, row) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (row) return res.status(400).json({ success: false, message: 'Email already registered' });

            const hashedPassword = await bcrypt.hash(user_password, 10);
            db.run(
                "INSERT INTO users (user_name, user_email, user_password) VALUES (?, ?, ?)",
                [user_name, user_email, hashedPassword],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: 'Database error' });
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
    if (!user_email || !user_password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        db.get("SELECT * FROM users WHERE user_email = ?", [user_email], async (err, user) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            const isMatch = await bcrypt.compare(user_password, user.user_password);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

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
app.post("/update-profile", isVendorAuthenticated, upload.single("profilePic"), async (req, res) => {
    try {
        const { user_name, user_phone, user_address } = req.body;
        const user_email = req.session.user.user_email;

        if (!user_name && !user_phone && !user_address && !req.file) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }
        if (user_name && user_name.length < 2) {
            return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
        }

        let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        let query = "UPDATE users SET ";
        const values = [];
        const updates = [];

        if (user_name) { updates.push("user_name=?"); values.push(user_name); }
        if (user_phone) { updates.push("user_phone=?"); values.push(user_phone); }
        if (user_address) { updates.push("user_address=?"); values.push(user_address); }
        if (imageUrl) { updates.push("profile_pic=?"); values.push(imageUrl); }

        query += updates.join(", ") + " WHERE user_email=?";
        values.push(user_email);

        db.run(query, values, function (err) {
            if (err) return res.status(500).json({ success: false, message: "Database update failed" });

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
        if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
        res.redirect('/home');
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

const isAdminAuthenticated = (req, res, next) => {
    if (req.session.admin) { // Set this in /admin-login
        next();
    } else {
        res.status(403).json({ success: false, message: 'Admin access required' });
    }
};

// Admin login
const admin = { email: "admin@gmail.com", password: "admin123#" };
app.post('/admin-login', (req, res) => {
    const { admin_email, admin_password } = req.body;
    if (admin_email === admin.email && admin_password === admin.password) {
        req.session.admin = { email: admin_email };
        res.json({ success: true });
    } else {
        res.json({ success: false, error: "Invalid email or password" });
    }
});

// Store signup route
app.post('/store-signup', async (req, res) => {
    const { name, contactnumber, email, password, confirmpassword, storename, storelocation } = req.body;

    if (!name || !contactnumber || !email || !password || !storename || !storelocation) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    try {
        db.get("SELECT * FROM vendors WHERE email = ?", [email], async (err, row) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (row) return res.status(400).json({ success: false, message: 'Email already registered' });
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run(
                `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location ) VALUES (?, ?, ?, ?, ?, ?)`,
                [name, contactnumber, email, hashedPassword, storename, storelocation],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: 'Database error' });
                    console.log('Vendor registered:', { name, email, storename });
                    res.status(201).json({ success: true, redirect:'/service_provider_login',message: 'Vendor signup successful' });
                }
            );
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Service provider login
app.post('/service-provider-login', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    try {
        let table, redirect, sessionKey;
        if (role === 'store-manager') {
            table = 'vendors';
            redirect = '/shop-dashboard';
            sessionKey = 'vendor';
        } else if (role === 'event-manager') {
            table = 'event_managers';
            redirect = '/eventmanager_dashboard';
            sessionKey = 'eventManager';
        } else {
            return res.status(400).json({ success: false, message: 'Invalid role. Must be "store-manager" or "event-manager"' });
        }

        db.get(`SELECT * FROM ${table} WHERE email = ?`, [email], async (err, user) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            if (role === 'event-manager') {
                req.session.eventManager = { id: user.id, email: user.email, role: role };
            } else if (role === 'store-manager') {
                req.session.vendor = { id: user.id, email: user.email, role: role, store_name: user.store_name };
            }

            res.status(200).json({ success: true, message: 'Login successful', redirect: redirect });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Product submission route
app.post('/submit-product', isVendorAuthenticated, (req, res) => {
    uploadProductImages(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(500).json({ success: false, message: `Server error: ${err.message}` });
        }

        const {
            'product-name': productName,
            'product-category': productCategory,
            'product-type': productType,
            'product-description': productDescription,
            'regular-price': regularPrice,
            'sale-price': salePrice,
            'sku': sku,
            'stock-quantity': stockQuantity,
            'stock-status': stockStatus,
            'color': color,
            'size': size,
            'material': material,
            'weight': weight
        } = req.body;

        if (!productName || !productCategory || !productType || !productDescription || !regularPrice || !stockQuantity) {
            return res.status(400).json({ success: false, message: 'Required fields are missing' });
        }

        db.run(
            `INSERT INTO products (
                vendor_id, product_name, product_category, product_type, 
                product_description, regular_price, sale_price, sku, 
                stock_quantity, stock_status, color, size, material, weight
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.vendor.id, productName, productCategory, productType,
                productDescription, regularPrice, salePrice || null, sku,
                stockQuantity, stockStatus, color, size, material, weight
            ],
            function(err) {
                if (err) {
                    console.error('Error inserting product:', err);
                    return res.status(500).json({ success: false, message: 'Failed to save product' });
                }

                const productId = this.lastID;
                if (req.files && req.files.length > 0) {
                    const imageValues = req.files.map((file, index) => [
                        productId,
                        `/uploads/products/${file.filename}`,
                        index === 0 ? 1 : 0
                    ]);
                    const placeholders = imageValues.map(() => '(?, ?, ?)').join(', ');
                    const flatValues = imageValues.flat();

                    db.run(
                        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES ${placeholders}`,
                        flatValues,
                        function(err) {
                            if (err) {
                                console.error('Error inserting product images:', err);
                                return res.status(500).json({ success: false, message: 'Failed to save product images' });
                            }
                            res.status(201).json({ success: true, message: 'Product added successfully', productId: productId });
                        }
                    );
                } else {
                    res.status(201).json({ success: true, message: 'Product added successfully (no images)', productId: productId });
                }
            }
        );
    });
});

// Get vendor products
app.get('/vendor/products', isVendorAuthenticated, (req, res) => {
    db.all(
        `SELECT p.*, 
         (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
         FROM products p WHERE p.vendor_id = ? ORDER BY p.created_at DESC`,
        [req.session.vendor.id],
        (err, products) => {
            if (err) {
                console.error('Error fetching products:', err);
                return res.status(500).json({ success: false, message: 'Failed to fetch products' });
            }
            res.json({ success: true, products: products });
        }
    );
});

// Get single product
app.get('/product/:id', (req, res) => {
    const productId = req.params.id;

    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        db.all('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC', [productId], (err, images) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            product.images = images;
            res.json({ success: true, product: product });
        });
    });
});

// Update product
app.put('/product/:id', isVendorAuthenticated, (req, res) => {
    const productId = req.params.id;

    db.get('SELECT vendor_id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (product.vendor_id !== req.session.user.id) return res.status(403).json({ success: false, message: 'You do not have permission to update this product' });

        uploadProductImages(req, res, function(err) {
            if (err) return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });

            const {
                'product-name': productName,
                'product-category': productCategory,
                'product-type': productType,
                'product-description': productDescription,
                'regular-price': regularPrice,
                'sale-price': salePrice,
                'sku': sku,
                'stock-quantity': stockQuantity,
                'stock-status': stockStatus,
                'color': color,
                'size': size,
                'material': material,
                'weight': weight
            } = req.body;

            db.run(
                `UPDATE products SET
                    product_name = ?, product_category = ?, product_type = ?,
                    product_description = ?, regular_price = ?, sale_price = ?, sku = ?,
                    stock_quantity = ?, stock_status = ?, color = ?, size = ?, material = ?, weight = ?
                WHERE id = ?`,
                [
                    productName, productCategory, productType,
                    productDescription, regularPrice, salePrice || null, sku,
                    stockQuantity, stockStatus, color, size, material, weight,
                    productId
                ],
                function(err) {
                    if (err) return res.status(500).json({ success: false, message: 'Failed to update product' });

                    if (req.files && req.files.length > 0) {
                        const imageValues = req.files.map(file => [
                            productId,
                            `/uploads/products/${file.filename}`,
                            0
                        ]);
                        const placeholders = imageValues.map(() => '(?, ?, ?)').join(', ');
                        const flatValues = imageValues.flat();

                        db.run(
                            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES ${placeholders}`,
                            flatValues,
                            function(err) {
                                if (err) return res.status(500).json({ success: false, message: 'Failed to save new product images' });
                                res.json({ success: true, message: 'Product updated successfully' });
                            }
                        );
                    } else {
                        res.json({ success: true, message: 'Product updated successfully (no new images)' });
                    }
                }
            );
        });
    });
});

// Delete product
app.delete('/product/:id', isVendorAuthenticated, (req, res) => {
    const productId = req.params.id;

    db.get('SELECT vendor_id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (product.vendor_id !== req.session.user.id) return res.status(403).json({ success: false, message: 'You do not have permission to delete this product' });

        db.run('DELETE FROM product_images WHERE product_id = ?', [productId], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Failed to delete product images' });

            db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
                if (err) return res.status(500).json({ success: false, message: 'Failed to delete product' });
                res.json({ success: true, message: 'Product deleted successfully' });
            });
        });
    });
});

// Delete product image
app.delete('/product-image/:id', isVendorAuthenticated, (req, res) => {
    const imageId = req.params.id;

    db.get(
        `SELECT pi.id, pi.product_id, p.vendor_id 
         FROM product_images pi
         JOIN products p ON pi.product_id = p.id
         WHERE pi.id = ?`,
        [imageId],
        (err, image) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (!image) return res.status(404).json({ success: false, message: 'Image not found' });
            if (image.vendor_id !== req.session.user.id) return res.status(403).json({ success: false, message: 'You do not have permission to delete this image' });

            db.run('DELETE FROM product_images WHERE id = ?', [imageId], function(err) {
                if (err) return res.status(500).json({ success: false, message: 'Failed to delete image' });
                res.json({ success: true, message: 'Image deleted successfully' });
            });
        }
    );
});







// Get all users for admin
app.get('/admin/users', isAdminAuthenticated, (req, res) => {
    db.all(
        `SELECT id, user_name AS name, user_email AS email, created_at AS joined_date 
         FROM users ORDER BY created_at DESC`,
        [],
        (err, users) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            res.json({ success: true, users });
        }
    );
});


// Get all products for admin
app.get('/admin/products', isAdminAuthenticated, (req, res) => {
    db.all(
        `SELECT p.id, p.product_name, p.product_category, p.regular_price, p.stock_quantity, p.created_at,
                (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
         FROM products p ORDER BY p.created_at DESC`,
        [],
        (err, products) => {
            if (err) {
                console.error('Error fetching products:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }
            res.json({ success: true, products });
        }
    );
});


// User stats
app.get('/admin/user-stats', isAdminAuthenticated, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.get('SELECT COUNT(*) as total FROM users', (err, total) => {
        if (err) return res.status(500).json({ success: false });
        db.get('SELECT COUNT(*) as monthly FROM users WHERE created_at >= ?', [monthAgo], (err, monthly) => {
            if (err) return res.status(500).json({ success: false });
            db.get('SELECT COUNT(*) as weekly FROM users WHERE created_at >= ?', [weekAgo], (err, weekly) => {
                if (err) return res.status(500).json({ success: false });
                db.get('SELECT COUNT(*) as daily FROM users WHERE created_at >= ?', [today], (err, daily) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({
                        success: true,
                        stats: {
                            total: total.total,
                            monthly: monthly.monthly,
                            weekly: weekly.weekly,
                            daily: daily.daily
                        }
                    });
                });
            });
        });
    });
});

// Product stats
app.get('/admin/product-stats', isAdminAuthenticated, (req, res) => {
    db.get('SELECT COUNT(*) as total FROM products', (err, total) => {
        if (err) return res.status(500).json({ success: false });
        db.get('SELECT COUNT(*) as inStock FROM products WHERE stock_quantity > 0', (err, inStock) => {
            if (err) return res.status(500).json({ success: false });
            db.get('SELECT COUNT(*) as lowStock FROM products WHERE stock_quantity BETWEEN 1 AND 10', (err, lowStock) => {
                if (err) return res.status(500).json({ success: false });
            db.get('SELECT COUNT(*) as outOfStock FROM products WHERE stock_quantity = 0', (err, outOfStock) => {
                    if (err) return res.status(500).json({ success: false });
                    res.json({
                        success: true,
                        stats: {
                            total: total.total,
                            inStock: inStock.inStock,
                            lowStock: lowStock.lowStock,
                            outOfStock: outOfStock.outOfStock
                        }
                    });
                });
            });
        });
    });
});


// Initialize database and start server
function initializeDatabase() {
    createTables(() => {
                insertSampleData(() => {
                    app.listen(3000, () => {
                        console.log('Server is running on port 3000');
                        console.log('http://localhost:3000/pet_accessory');
                        console.log('http://localhost:3000/home');
                        console.log('http://localhost:3000/service_provider_login');
                    });
        });
    });
}

initializeDatabase();