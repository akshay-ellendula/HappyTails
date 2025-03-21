// models/database.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

function createTables(callback) {
    db.serialize(() => {
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
        `, (err) => { if (err) console.error('Error creating users table:', err); else console.log('Users table created'); });

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
        `, (err) => { if (err) console.error('Error creating vendors table:', err); else console.log('Vendors table created'); });

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
        `, (err) => { if (err) console.error('Error creating products table:', err); else console.log('Products table created'); });

        db.run(`
            CREATE TABLE IF NOT EXISTS product_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                is_primary BOOLEAN DEFAULT 0,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `, (err) => { if (err) console.error('Error creating product_images table:', err); else console.log('Product_images table created'); callback(); });
    });
}

function insertSampleData(callback) {
    const queries = [
        `INSERT INTO users (user_name, user_email, user_password) VALUES 
         ('Gautam Thota', 'gautam.thota@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W')`,
        `INSERT INTO users (user_name, user_email, user_password) VALUES 
         ('Veda Prakash', 'veda.prakash@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W')`,
        `INSERT INTO users (user_name, user_email, user_password) VALUES 
         ('Akshay', 'akshay@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W')`,
        `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES 
         ('Gautam Thota', '9876543210', 'gautam.thota@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Pet Haven', 'Vijayawada')`,
        `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES 
         ('Veda Prakash', '8765432109', 'veda.prakash@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Furry Friends', 'Hyderabad')`,
        `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES 
         ('Akshay', '7654321098', 'akshay@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Paws & Claws', 'Bangalore')`,
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sale_price, sku, stock_quantity, stock_status, color, size, material, weight) VALUES 
         (1, 'Cozy Pet Bed', 'Accessories', 'Pet Beds', 'Soft and cozy bed for pets', 2999.99, 2499.99, 'PB001', 20, 'In Stock', 'Brown', 'Medium', 'Cotton', 2.5)`,
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sku, stock_quantity, stock_status, size, weight) VALUES 
         (1, 'Chicken-Flavored Dog Food', 'Pet Food', 'Dry', 'Nutritious dog food for all breeds', 1499.99, 'DF001', 50, 'In Stock', 'Large', 5.0)`,
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sale_price, sku, stock_quantity, stock_status, color, size, material, weight) VALUES 
         (2, 'Cat Scratching Post', 'Accessories', 'Furniture', 'Durable scratching post for cats', 1999.99, 1799.99, 'SP001', 15, 'In Stock', 'Grey', 'Large', 'Sisal/Wood', 3.0)`,
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sku, stock_quantity, stock_status, size, weight) VALUES 
         (2, 'Fish-Flavored Treats', 'Pet Food', 'Treats', 'Delicious treats for cats', 499.99, 'FT001', 100, 'In Stock', 'Small', 0.25)`,
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sale_price, sku, stock_quantity, stock_status, color, size, material, weight) VALUES 
         (3, 'Grooming Brush', 'Grooming', 'Grooming Supplies', 'Gentle brush for pet grooming', 799.99, 699.99, 'GB001', 30, 'In Stock', 'Blue', 'Medium', 'Plastic', 0.2)`,
        `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, regular_price, sale_price, sku, stock_quantity, stock_status, color, size, material, weight) VALUES 
         (3, 'Pet Carrier', 'Accessories', 'Carrier', 'Portable carrier for small pets', 3999.99, 3499.99, 'PC001', 10, 'In Stock', 'Grey', 'Medium', 'Plastic/Fabric', 2.0)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (1, 'https://m.media-amazon.com/images/I/71bQdtBbRdL._SX679_.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (1, '/images/cat_in_cat_cave.jpg', 0)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (2, '/images/cat_in_cat_cave.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (3, 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn...', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (4, 'https://m.media-amazon.com/images/I/71bQdtBbRdL._SX679_.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (5, '/images/cat_in_cat_cave.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (6, '/images/cat_in_cat_cave.jpg', 1)`,
        `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (6, '/images/cat_in_cat_cave.jpg', 0)`
    ];

    let completedQueries = 0;
    const totalQueries = queries.length;

    queries.forEach((query, index) => {
        db.run(query, (err) => {
            if (err) console.error(`Error inserting data at step ${index + 1}:`, err.message);
            else console.log(`Inserted data at step ${index + 1} successfully`);
            completedQueries++;
            if (completedQueries === totalQueries) callback();
        });
    });
}

module.exports = { db, createTables, insertSampleData };