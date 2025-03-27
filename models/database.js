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
        // Existing table creations (unchanged)
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
        // Add new table for event managers
        db.run(`
    CREATE TABLE IF NOT EXISTS event_managers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_number TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        company_name TEXT NOT NULL, 
        location TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => { if (err) console.error('Error creating event_managers table:', err); else console.log('Event_managers table created'); });
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                product_category TEXT NOT NULL,
                product_type TEXT NOT NULL,
                product_description TEXT NOT NULL,
                sku TEXT,
                stock_status TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vendor_id) REFERENCES vendors(id)
            )
        `, (err) => { if (err) console.error('Error creating products table:', err); else console.log('Products table created'); });

        db.run(`
            CREATE TABLE IF NOT EXISTS product_variants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                size TEXT,
                color TEXT,
                regular_price REAL NOT NULL,
                sale_price REAL,
                stock_quantity INTEGER NOT NULL,
                sku TEXT,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `, (err) => { if (err) console.error('Error creating product_variants table:', err); else console.log('Product_variants table created'); });

        db.run(`
            CREATE TABLE IF NOT EXISTS product_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                image_path TEXT NOT NULL,
                is_primary BOOLEAN DEFAULT 0,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `, (err) => { if (err) console.error('Error creating product_images table:', err); else console.log('Product_images table created'); });

        db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'Pending',
                subtotal REAL NOT NULL,
                total_amount REAL NOT NULL,
                delivery_date TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => { if (err) console.error('Error creating orders table:', err); else console.log('Orders table created'); });

        db.run(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER,
                variant_id INTEGER,
                product_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,    
                size TEXT,
                color TEXT,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (variant_id) REFERENCES product_variants(id)
            )
        `, (err) => { if (err) console.error('Error creating order_items table:', err); else console.log('Order_items table created'); callback(); });

                    // New table: events
                    db.run(`
                        CREATE TABLE IF NOT EXISTS events (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            event_manager_id INTEGER NOT NULL,
                            event_name TEXT NOT NULL,
                            about_event TEXT NOT NULL,
                            language TEXT NOT NULL,
                            duration TEXT NOT NULL,
                            ticket_price REAL NOT NULL,
                            age_limit INTEGER NOT NULL,
                            instructions TEXT NOT NULL,
                            venue TEXT NOT NULL,
                            terms TEXT NOT NULL,
                            category TEXT NOT NULL,
                            date_time TIMESTAMP NOT NULL,
                            status TEXT NOT NULL DEFAULT 'Upcoming',
                            total_tickets INTEGER NOT NULL DEFAULT 1000,
                            tickets_sold INTEGER NOT NULL DEFAULT 0,
                            city TEXT NOT NULL,
                            contact_number TEXT NOT NULL,
                            image TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (event_manager_id) REFERENCES event_managers(id)
                        )
                    `, (err) => { if (err) console.error('Error creating events table:', err); else console.log('Events table created'); });
        // New table: event_attendees
        db.run(`
            CREATE TABLE IF NOT EXISTS event_attendees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id INTEGER NOT NULL,
                user_id INTEGER,
                name TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                email TEXT NOT NULL,
                address TEXT NOT NULL,
                seats INTEGER NOT NULL DEFAULT 1,
                with_pet BOOLEAN NOT NULL DEFAULT 0,
                pet_name TEXT,
                pet_breed TEXT,
                pet_dob DATE,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => { if (err) console.error('Error creating event_attendees table:', err); else console.log('Event_attendees table created'); });
        db.run(`
            CREATE TABLE IF NOT EXISTS event_managers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact_number TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                company_name TEXT NOT NULL,
                location TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => { if (err) console.error('Error creating event_managers table:', err); else console.log('Event_managers table created'); });

        db.run(`
            CREATE TABLE IF NOT EXISTS event_managers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact_number TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                company_name TEXT NOT NULL,
                location TEXT NOT NULL,
                event_type TEXT, -- New field
                license TEXT, -- New field
                bio TEXT, -- New field
                member_since TEXT, -- New field
                image TEXT -- New field
            )
        `, (err) => {
            if (err) console.error('Error creating event_managers table:', err);
            else console.log('event_managers table created successfully');
        });

    });
}
function insertSampleData(callback) {
    db.serialize(() => {
        // Clear tables before inserting to avoid duplicates
        db.run('DELETE FROM order_items', (err) => { if (err) console.error('Error clearing order_items:', err); });
        db.run('DELETE FROM orders', (err) => { if (err) console.error('Error clearing orders:', err); });
        db.run('DELETE FROM product_images', (err) => { if (err) console.error('Error clearing product_images:', err); });
        db.run('DELETE FROM product_variants', (err) => { if (err) console.error('Error clearing product_variants:', err); });
        db.run('DELETE FROM products', (err) => { if (err) console.error('Error clearing products:', err); });
        db.run('DELETE FROM vendors', (err) => { if (err) console.error('Error clearing vendors:', err); });
        db.run('DELETE FROM users', (err) => { if (err) console.error('Error clearing users:', err); });
        db.run('DELETE FROM event_managers', (err) => { if (err) console.error('Error clearing event_managers:', err); });
        db.run('DELETE FROM event_attendees', (err) => { if (err) console.error('Error clearing event_attendees:', err); });
        db.run('DELETE FROM events', (err) => { if (err) console.error('Error clearing events:', err); });

        const queries = [
            // Users
            `INSERT INTO users (user_name, user_email, user_password) VALUES 
             ('Gautam Thota', 'gautam.thota@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W')`,
            `INSERT INTO users (user_name, user_email, user_password) VALUES 
             ('Veda Prakash', 'veda.prakash@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W')`,
            `INSERT INTO users (user_name, user_email, user_password) VALUES 
             ('Akshay', 'akshay@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W')`,

            // Vendors
            `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES 
             ('Gautam Thota', '9876543210', 'gautam.thota.vendor@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Pet Haven', 'Vijayawada')`,
            `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES 
             ('Veda Prakash', '8765432109', 'veda.prakash.vendor@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Furry Friends', 'Hyderabad')`,
            `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES 
             ('Akshay', '7654321098', 'akshay.vendor@example.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Paws & Claws', 'Bangalore')`,

            // Products (unchanged)
            `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, sku, stock_status) VALUES 
             (1, 'Cozy Pet Bed', 'beds', 'Pet Beds', 'A soft and cozy bed perfect for pets to relax in.', 'PB001', 'In Stock')`,
            `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, sku, stock_status) VALUES 
             (1, 'Chicken-Flavored Dog Food', 'food', 'Dry', 'Nutritious dry food for dogs with a chicken flavor.', 'DF001', 'In Stock')`,
            `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, sku, stock_status) VALUES 
             (2, 'Cat Scratching Post', 'toys', 'Furniture', 'Durable scratching post to keep cats entertained.', 'SP001', 'In Stock')`,
            `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, sku, stock_status) VALUES 
             (2, 'Fish-Flavored Treats', 'food', 'Treats', 'Delicious fish-flavored treats for cats.', 'FT001', 'In Stock')`,
            `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, sku, stock_status) VALUES 
             (3, 'Grooming Brush', 'grooming', 'Grooming Supplies', 'Gentle brush for keeping pet fur smooth.', 'GB001', 'In Stock')`,
            `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, sku, stock_status) VALUES 
             (3, 'Pet Carrier', 'beds', 'Carrier', 'Portable carrier for small pets.', 'PC001', 'In Stock')`,
            `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, sku, stock_status) VALUES 
             (1, 'Interactive Dog Ball', 'toys', 'Toys', 'A durable ball that lights up for interactive play.', 'DB001', 'In Stock')`,
            `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, sku, stock_status) VALUES 
             (2, 'Luxury Cat Bed', 'beds', 'Pet Beds', 'A plush bed with extra cushioning for cats.', 'CB001', 'In Stock')`,

            // Product Variants (unchanged)
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (1, 'Small', 'Brown', 1999.99, 1799.99, 10, 'PB001-SM-BRN')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (1, 'Medium', 'Brown', 2999.99, 2499.99, 20, 'PB001-MD-BRN')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (1, 'Large', 'Brown', 3999.99, 3499.99, 15, 'PB001-LG-BRN')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (1, 'Medium', 'Grey', 2999.99, 2599.99, 8, 'PB001-MD-GRY')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (2, '1kg', NULL, 499.99, NULL, 30, 'DF001-1KG')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (2, '5kg', NULL, 1499.99, NULL, 50, 'DF001-5KG')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (3, 'Small', 'Grey', 999.99, 899.99, 25, 'SP001-SM-GRY')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (3, 'Large', 'Grey', 1999.99, 1799.99, 15, 'SP001-LG-GRY')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (4, '100g', NULL, 199.99, NULL, 100, 'FT001-100G')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (4, '250g', NULL, 499.99, NULL, 75, 'FT001-250G')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (5, NULL, 'Blue', 799.99, 699.99, 30, 'GB001-BLU')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (5, NULL, 'Red', 799.99, 699.99, 20, 'GB001-RED')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (6, 'Small', 'Grey', 2999.99, 2799.99, 12, 'PC001-SM-GRY')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (6, 'Medium', 'Grey', 3999.99, 3499.99, 10, 'PC001-MD-GRY')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (7, 'Small', 'Green', 599.99, 549.99, 40, 'DB001-SM-GRN')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (7, 'Medium', 'Green', 799.99, 699.99, 30, 'DB001-MD-GRN')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (8, 'Small', 'Purple', 2499.99, 2299.99, 15, 'CB001-SM-PUR')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (8, 'Large', 'Purple', 3499.99, 3199.99, 10, 'CB001-LG-PUR')`,
            `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity, sku) VALUES 
             (8, 'Large', 'White', 3499.99, 3199.99, 8, 'CB001-LG-WHT')`,

            // Product Images (unchanged)
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (1, '/images/cat in cat cave, to advertise the cat cave with a plane grey background, a little bigger.jpg', 1)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (1, '/images/cat in cat cave, to advertise the cat cave with a plane grey background, a little bigger.jpg', 0)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (2, 'https://m.media-amazon.com/images/I/71bQdtBbRdL._SX679_.jpg', 1)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (3, 'https://outdocart.s3.amazonaws.com/uploads/petamore/productImages/full/16674284952277The-Grey.jpg', 1)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (4, 'https://m.media-amazon.com/images/I/71bQdtBbRdL._SX679_.jpg', 1)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (5, 'https://m.media-amazon.com/images/I/31aUaDQjrML._SY300_SX300_QL70_FMwebp_.jpg', 1)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (5, 'https://m.media-amazon.com/images/I/812do46q6rL._SY450_.jpg', 0)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (6, 'https://animeal.in/cdn/shop/files/I04885_1.webp?v=1705649283&width=493', 1)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (7, 'https://qpets.in/cdn/shop/files/61V2I5Y6RkL_1800x1800.jpg?v=1732756268', 1)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (8, 'https://headsupfortails.com/cdn/shop/products/HUFT-Personalised-Cosy-Puppy-Cat-Bed---Lilac.jpg?v=1739045338&width=823', 1)`,
            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES 
             (8, '/images/luxury_cat_bed_white.jpg', 0)`,

            // Sample Orders
            `INSERT INTO orders (user_id, order_date, status, subtotal, total_amount, delivery_date) VALUES 
            (1, '2025-03-01 10:00:00', 'Delivered', 1799.99, 1799.99, '2025-03-05 14:00:00')`,
            `INSERT INTO order_items (order_id, product_id, variant_id, product_name, quantity, price, size, color) VALUES 
            (1, 1, 1, 'Cozy Pet Bed', 1, 1799.99, 'Small', 'Brown')`,
            `INSERT INTO orders (user_id, order_date, status, subtotal, total_amount) VALUES 
            (1, '2025-03-10 12:00:00', 'Pending', 549.99, 549.99)`,
            `INSERT INTO order_items (order_id, product_id, variant_id, product_name, quantity, price, size, color) VALUES 
            (2, 7, 13, 'Interactive Dog Ball', 1, 549.99, 'Small', 'Green')`,
            // Orders for Veda Prakash (vendor_id 2)
            // Order 3: Veda Prakash's product (Cat Scratching Post, product_id 3, variant_id 7)
            `INSERT INTO orders (user_id, order_date, status, subtotal, total_amount, delivery_date) VALUES 
            (2, '2025-03-15 09:00:00', 'Delivered', 899.99, 899.99, '2025-03-20 14:00:00')`,
            `INSERT INTO order_items (order_id, product_id, variant_id, product_name, quantity, price, size, color) VALUES 
            (3, 3, 7, 'Cat Scratching Post', 1, 899.99, 'Small', 'Grey')`,
            // Order 4: Veda Prakash's product (Fish-Flavored Treats, product_id 4, variant_id 9)
            `INSERT INTO orders (user_id, order_date, status, subtotal, total_amount) VALUES 
            (2, '2025-03-18 11:00:00', 'Pending', 199.99, 199.99)`,
            `INSERT INTO order_items (order_id, product_id, variant_id, product_name, quantity, price, size, color) VALUES 
            (4, 4, 9, 'Fish-Flavored Treats', 1, 199.99, '100g', NULL)`,
            // Order 5: Veda Prakash's product (Luxury Cat Bed, product_id 8, variant_id 17)
            `INSERT INTO orders (user_id, order_date, status, subtotal, total_amount, delivery_date) VALUES 
            (3, '2025-03-20 15:00:00', 'Delivered', 2299.99, 2299.99, '2025-03-25 10:00:00')`,
            `INSERT INTO order_items (order_id, product_id, variant_id, product_name, quantity, price, size, color) VALUES 
            (5, 8, 17, 'Luxury Cat Bed', 1, 2299.99, 'Small', 'Purple')`,

            // Sample Event Manager
            `INSERT INTO event_managers (name, contact_number, email, password, company_name, location) VALUES 
            ('Jeevankumar', '5551234567', 'jeevan.kumar@happytails.com', '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W', 'Happy Events', 'Hyderabad')`,

            // Sample Events (Updated with Past, Ongoing, and Upcoming)
            // Past Event
            `INSERT INTO events (event_manager_id, event_name, about_event, language, duration, ticket_price, age_limit, instructions, venue, terms, category, date_time, status, total_tickets, tickets_sold, city, contact_number, image) VALUES 
            (1, 'Pet Adoption Drive', 'A drive to find homes for shelter pets.', 'English', '3h', 0.00, 0, 'Bring ID proof.', 'Shelter Grounds, Bangalore', 'Free entry.', 'Pets', '2025-03-15 10:00:00', 'Past', 500, 450, 'Bangalore', '1234567890', '/images/pet_adoption.jpg')`,
            // Ongoing Events (on March 27, 2025)
            `INSERT INTO events (event_manager_id, event_name, about_event, language, duration, ticket_price, age_limit, instructions, venue, terms, category, date_time, status, total_tickets, tickets_sold, city, contact_number, image) VALUES 
            (1, 'Fancy Dress Show', 'A fun fancy dress show for pets.', 'English', '2h', 5.00, 0, 'Bring your pet in a costume.', 'Central Park, Delhi', 'No refunds.', 'Pets', '2025-03-27 17:00:00', 'Ongoing', 1000, 900, 'Delhi', '1234567890', '/images/pet_fancy_dress.webp')`,
            `INSERT INTO events (event_manager_id, event_name, about_event, language, duration, ticket_price, age_limit, instructions, venue, terms, category, date_time, status, total_tickets, tickets_sold, city, contact_number, image) VALUES 
            (1, 'Dog Run', 'A running competition for dogs.', 'English', '1h', 5.00, 0, 'Ensure your dog is healthy.', 'Sports Ground, Delhi', 'No refunds.', 'Pets', '2025-03-27 10:00:00', 'Ongoing', 1000, 100, 'Delhi', '1234567890', '/images/dog_running.webp')`,
            // Upcoming Events (after March 27, 2025)
            `INSERT INTO events (event_manager_id, event_name, about_event, language, duration, ticket_price, age_limit, instructions, venue, terms, category, date_time, status, total_tickets, tickets_sold, city, contact_number, image) VALUES 
            (1, 'Dog Agility Competitions', 'A competition for dog agility.', 'English', '2h', 5.00, 0, 'Bring your dog.', 'Park, Hyderabad', 'No refunds.', 'Pets', '2025-04-01 09:30:00', 'Upcoming', 1000, 850, 'Hyderabad', '1234567890', '/images/dog_agility.jpeg')`,
            `INSERT INTO events (event_manager_id, event_name, about_event, language, duration, ticket_price, age_limit, instructions, venue, terms, category, date_time, status, total_tickets, tickets_sold, city, contact_number, image) VALUES 
            (1, 'Pet Festival', 'A festival for pet lovers.', 'English', '3h', 10.00, 0, 'Bring your pet.', 'Mumbai Park', 'No refunds.', 'Pets', '2025-04-05 11:00:00', 'Upcoming', 1500, 740, 'Mumbai', '1234567890', '/images/pet_festival.jpeg')`,
            `INSERT INTO events (event_manager_id, event_name, about_event, language, duration, ticket_price, age_limit, instructions, venue, terms, category, date_time, status, total_tickets, tickets_sold, city, contact_number, image) VALUES 
            (1, 'Cat Show', 'A showcase of feline beauty.', 'English', '2h', 8.00, 0, 'Bring your cat.', 'Convention Center, Chennai', 'No refunds.', 'Pets', '2025-04-10 14:00:00', 'Upcoming', 800, 300, 'Chennai', '1234567890', '/images/cat_show.jpg')`,

            // Sample Event Attendees
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (1, 1, 'Christopher Blake', '946776866876', 'christopher.blake@example.com', '123 Main St, Bangalore', 5, 1, 'Max', 'Golden Retriever', '2020-05-15', '2025-02-20 10:00:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (1, NULL, 'Sarah Lee', '9876543210', 'sarah.lee@example.com', '456 Elm St, Bangalore', 2, 0, NULL, NULL, NULL, '2025-02-25 14:30:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (2, NULL, 'Peter Roy', '943787457878', 'peter.roy@example.com', '456 Park Ave, Delhi', 1, 0, NULL, NULL, NULL, '2025-02-15 09:30:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (2, 2, 'Emily Davis', '9123456789', 'emily.davis@example.com', '789 Oak Rd, Delhi', 3, 1, 'Bella', 'Beagle', '2021-03-10', '2025-03-01 12:00:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (3, 3, 'Michael Chen', '9234567890', 'michael.chen@example.com', '321 Pine St, Delhi', 1, 1, 'Rocky', 'Husky', '2019-11-05', '2025-03-10 08:45:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (4, 2, 'Jake Paul', '941779828690', 'jake.paul@example.com', '789 Oak St, Hyderabad', 3, 1, 'Luna', 'Labrador', '2019-08-10', '2025-03-01 08:00:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (4, NULL, 'Lisa Kumar', '9345678901', 'lisa.kumar@example.com', '654 Cedar Ave, Hyderabad', 2, 1, 'Buddy', 'Poodle', '2020-12-15', '2025-03-20 15:00:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (5, 3, 'Akshay', '7654321098', 'akshay@example.com', '321 Pine St, Mumbai', 2, 1, 'Milo', 'Persian', '2021-01-20', '2025-03-25 12:00:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (5, NULL, 'Priya Sharma', '9456789012', 'priya.sharma@example.com', '987 Maple Ln, Mumbai', 4, 1, 'Toby', 'Dachshund', '2022-06-01', '2025-03-26 09:15:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (6, 1, 'Gautam Thota', '9876543210', 'gautam.thota@example.com', '123 Main St, Chennai', 1, 1, 'Whiskers', 'Siamese', '2020-09-25', '2025-03-27 10:30:00')`,
            `INSERT INTO event_attendees (event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob, registration_date) VALUES 
            (6, NULL, 'Anita Rao', '9567890123', 'anita.rao@example.com', '456 Birch Rd, Chennai', 2, 1, 'Snowball', 'Maine Coon', '2021-04-12', '2025-03-28 14:00:00')`   


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
    });
}
module.exports = { db, createTables, insertSampleData };



