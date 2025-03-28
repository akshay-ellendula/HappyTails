// controllers/vendorController.js
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/products/'); // Ensure this directory exists
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});
const upload = multer({ storage: storage });

// Fetch vendor orders
const getVendorOrders = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const statusFilter = req.query.status || 'all'; // Default to 'all' if no status is provided

    try {
        // Construct the query to fetch orders
        let ordersQuery = `
            SELECT o.id, o.order_date, o.status, o.total_amount, u.user_name,
                   GROUP_CONCAT(oi.product_name, ', ') as products
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE p.vendor_id = ?
        `;
        const queryParams = [vendorId];

        // Add status filter if not 'all'
        if (statusFilter !== 'all') {
            ordersQuery += ` AND o.status = ?`;
            queryParams.push(statusFilter);
        }

        ordersQuery += ` GROUP BY o.id ORDER BY o.order_date DESC`;

        const orders = await new Promise((resolve, reject) => {
            db.all(ordersQuery, queryParams, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        res.render('shop-orders', {
            vendor: req.session.vendor,
            orders: orders.map(order => ({
                id: order.id,
                order_id: `#ORD-${order.id}`,
                customer: order.user_name,
                products: order.products,
                total: order.total_amount.toFixed(2),
                date: new Date(order.order_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
                status: order.status
            })),
            status: statusFilter // Pass the status filter to the template
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Server error');
    }
};

const getVendorProducts = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const vendorId = vendor.id;

    try {
        // Fetch products for the vendor along with their primary image
        const productsQuery = `
            SELECT p.id, p.product_name, p.product_category, p.product_type, pv.sale_price, pv.stock_quantity, pi.image_path
            FROM products p
            LEFT JOIN product_variants pv ON p.id = pv.product_id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
            WHERE p.vendor_id = ?
        `;
        const products = await new Promise((resolve, reject) => {
            db.all(productsQuery, [vendorId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        // Calculate sold quantity for each product
        const productsWithSold = await Promise.all(products.map(async (product) => {
            const soldQuery = `
                SELECT SUM(oi.quantity) as sold
                FROM order_items oi
                WHERE oi.product_id = ?
            `;
            const soldResult = await new Promise((resolve, reject) => {
                db.get(soldQuery, [product.id], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            });
            return {
                ...product,
                sold: soldResult.sold || 0,
                image_path: product.image_path || '/images/default.jpg' // Fallback image if no image is found
            };
        }));

        // Render the products page with the vendor's data
        res.render('shop-products', {
            vendor: req.session.vendor,
            products: productsWithSold
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Server error');
    }
};

const getVendorProfile = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const vendorId = vendor.id;

    try {
        // Fetch vendor details from the database
        const vendorDetails = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM vendors WHERE id = ?`, [vendorId], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        // Calculate total revenue
        const totalRevenueQuery = `
            SELECT SUM(oi.price * oi.quantity) as totalRevenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE p.vendor_id = ?
        `;
        const totalRevenue = await new Promise((resolve, reject) => {
            db.get(totalRevenueQuery, [vendorId], (err, row) => {
                if (err) return reject(err);
                resolve(row.totalRevenue || 0);
            });
        });

        // Calculate products sold
        const productsSoldQuery = `
            SELECT SUM(oi.quantity) as productsSold
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE p.vendor_id = ?
        `;
        const productsSold = await new Promise((resolve, reject) => {
            db.get(productsSoldQuery, [vendorId], (err, row) => {
                if (err) return reject(err);
                resolve(row.productsSold || 0);
            });
        });

        // Calculate new orders
        const newOrdersQuery = `
            SELECT COUNT(DISTINCT o.id) as newOrders
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE p.vendor_id = ? AND o.status = 'Pending'
        `;
        const newOrders = await new Promise((resolve, reject) => {
            db.get(newOrdersQuery, [vendorId], (err, row) => {
                if (err) return reject(err);
                resolve(row.newOrders || 0);
            });
        });

        // Fetch recent orders
        const recentOrdersQuery = `
            SELECT o.id, o.order_date, o.status, o.total_amount, u.user_name, oi.product_name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE p.vendor_id = ?
            ORDER BY o.order_date DESC
            LIMIT 4
        `;
        const recentOrders = await new Promise((resolve, reject) => {
            db.all(recentOrdersQuery, [vendorId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        // Render the profile page with the vendor's data
        res.render('shop-profile', {
            vendor: {
                store_name: vendorDetails.store_name,
                owner_name: vendorDetails.name,
                email: vendorDetails.email,
                phone: vendorDetails.contact_number,
                address: vendorDetails.store_location,
                description: 'Happy Tails specializes in high-quality, eco-friendly pet accessories for cats and dogs. All our products are designed with pet comfort and safety in mind, using sustainable materials whenever possible.' // You can add a description field to the vendors table if needed
            },
            totalRevenue: totalRevenue.toFixed(2),
            productsSold,
            newOrders,
            recentOrders,
            customerRatings: '4.8/5' // Hardcoded for now; you can add a ratings system later
        });
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).send('Server error');
    }
};

const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    try {
        let table, sessionKey;
        if (role === 'store-manager') {
            table = 'vendors';
            sessionKey = 'vendor';
        } else {
            return res.status(400).json({ success: false, message: 'Invalid role. Only "store-manager" supported for now' });
        }

        db.get(`SELECT * FROM ${table} WHERE email = ?`, [email], async (err, user) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            // Store vendor data in session
            req.session[sessionKey] = { id: user.id, email: user.email, role, store_name: user.store_name };

            // Create a URL-friendly store name (e.g., "Furry Friends" -> "furry-friends")
            const storeNameSlug = user.store_name.toLowerCase().replace(/\s+/g, '-');

            // Redirect to dynamic URL
            const redirect = `/shop-dashboard/${storeNameSlug}`;
            res.status(200).json({ success: true, message: 'Login successful', redirect });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getVendorDashboard = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendor = req.session.vendor;
    const storeNameSlug = req.params.storeName;

    const expectedStoreNameSlug = vendor.store_name.toLowerCase().replace(/\s+/g, '-');

    if (storeNameSlug !== expectedStoreNameSlug) {
        return res.status(403).send('Unauthorized: You can only access your own dashboard.');
    }

    const vendorId = vendor.id;

    try {
        const totalRevenueQuery = `
            SELECT SUM(oi.price * oi.quantity) as totalRevenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE p.vendor_id = ?
        `;
        const totalRevenue = await new Promise((resolve, reject) => {
            db.get(totalRevenueQuery, [vendorId], (err, row) => {
                if (err) return reject(err);
                resolve(row.totalRevenue || 0);
            });
        });

        const productsSoldQuery = `
            SELECT SUM(oi.quantity) as productsSold
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN products p ON oi.product_id = p.id
            WHERE p.vendor_id = ?
        `;
        const productsSold = await new Promise((resolve, reject) => {
            db.get(productsSoldQuery, [vendorId], (err, row) => {
                if (err) return reject(err);
                resolve(row.productsSold || 0);
            });
        });

        const newOrdersQuery = `
            SELECT COUNT(DISTINCT o.id) as newOrders
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE p.vendor_id = ? AND o.status = 'Pending'
        `;
        const newOrders = await new Promise((resolve, reject) => {
            db.get(newOrdersQuery, [vendorId], (err, row) => {
                if (err) return reject(err);
                resolve(row.newOrders || 0);
            });
        });

        const recentOrdersQuery = `
            SELECT o.id, o.order_date, o.status, o.total_amount, u.user_name, oi.product_name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON o.user_id = u.id
            WHERE p.vendor_id = ?
            ORDER BY o.order_date DESC
            LIMIT 4
        `;
        const recentOrders = await new Promise((resolve, reject) => {
            db.all(recentOrdersQuery, [vendorId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        // Update the render path to point to the correct file
        res.render('shop-dashboard', {
            vendor: req.session.vendor,
            totalRevenue: totalRevenue.toFixed(2),
            productsSold,
            newOrders,
            recentOrders
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Server error');
    }
};

const storeSignup = async (req, res) => {
    const { name, contactnumber, email, password, confirmpassword, storename, storelocation } = req.body;

    if (!name || !contactnumber || !email || !password || !storename || !storelocation) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (name.length < 2) return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    if (!/^\d{10}$/.test(contactnumber)) return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email format' });
    if (password.length < 8 || !/\d/.test(password)) return res.status(400).json({ success: false, message: 'Password must be 8+ characters with a number' });
    if (password !== confirmpassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (storename.length < 2) return res.status(400).json({ success: false, message: 'Store name must be at least 2 characters' });
    if (storelocation.length < 3) return res.status(400).json({ success: false, message: 'Invalid store location' });

    try {
        db.get("SELECT * FROM vendors WHERE email = ?", [email], async (err, row) => {
            if (err) return res.status(500).json({ success: false, message: 'Database error' });
            if (row) return res.status(400).json({ success: false, message: 'Email already registered' });

            const hashedPassword = await bcrypt.hash(password, 10);
            db.run(
                `INSERT INTO vendors (name, contact_number, email, password, store_name, store_location) VALUES (?, ?, ?, ?, ?, ?)`,
                [name, contactnumber, email, hashedPassword, storename, storelocation],
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: 'Database error' });
                    res.status(201).json({ success: true, redirect: '/shop-dashboard', message: 'Vendor signup successful' });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Server error');
        }
        res.redirect('/service_provider_login');
    });
};

// Fetch product data for editing
const getProductForEdit = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;
    const productId = req.params.productId;

    try {
        // Fetch product details
        const productQuery = `
            SELECT p.*
            FROM products p
            WHERE p.id = ? AND p.vendor_id = ?
        `;
        const product = await new Promise((resolve, reject) => {
            db.get(productQuery, [productId, vendorId], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        if (!product) {
            // Redirect to products page with an error message
            return res.redirect('/shop-products?error=Product not found or you do not have permission to edit it.');
        }

        // Fetch all variants for the product
        const variantsQuery = `
            SELECT pv.*
            FROM product_variants pv
            WHERE pv.product_id = ?
        `;
        const variants = await new Promise((resolve, reject) => {
            db.all(variantsQuery, [productId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        // Fetch product images
        const imagesQuery = `
            SELECT * FROM product_images WHERE product_id = ?
        `;
        const images = await new Promise((resolve, reject) => {
            db.all(imagesQuery, [productId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        // Render the edit product page with the product data
        res.render('shop-product-edit', {
            vendor: req.session.vendor,
            product: {
                id: product.id,
                product_name: product.product_name,
                product_category: product.product_category,
                product_type: product.product_type,
                product_description: product.product_description,
                stock_status: product.stock_status,
                variants: variants || [], // Pass all variants
                images: images || []
            }
        });
    } catch (error) {
        console.error('Error fetching product for edit:', error);
        res.redirect('/shop-products?error=Server error while fetching product data.');
    }
};

// Update product
const updateProduct = [
    upload.array('productImages', 4), // Allow up to 4 images
    async (req, res) => {
        if (!req.session.vendor) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const vendorId = req.session.vendor.id;
        const productId = req.params.productId;
        const {
            productName,
            productCategory,
            productType,
            productDescription,
            stock_status, // Add stock_status
            'variant_size[]': variantSizes,
            'variant_color[]': variantColors,
            'variant_regular_price[]': variantRegularPrices,
            'variant_sale_price[]': variantSalePrices,
            'variant_stock_quantity[]': variantStockQuantities
        } = req.body;

        // Validate required fields
        if (!productName || !productCategory || !productType || !productDescription || !stock_status) {
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        if (!variantSizes || !variantRegularPrices || !variantStockQuantities) {
            return res.status(400).json({ success: false, message: 'At least one variant with size, regular price, and stock quantity is required' });
        }

        // Validate stock_status
        if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        try {
            // Verify the product belongs to the vendor
            const productCheck = await new Promise((resolve, reject) => {
                db.get(`SELECT * FROM products WHERE id = ? AND vendor_id = ?`, [productId, vendorId], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            });

            if (!productCheck) {
                return res.status(404).json({ success: false, message: 'Product not found or you do not have permission to edit it.' });
            }

            // Update product details
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE products SET product_name = ?, product_category = ?, product_type = ?, product_description = ?, stock_status = ? WHERE id = ?`,
                    [productName, productCategory, productType, productDescription, stock_status, productId],
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });

            // Delete existing variants
            await new Promise((resolve, reject) => {
                db.run(`DELETE FROM product_variants WHERE product_id = ?`, [productId], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            // Insert updated variants
            for (let i = 0; i < variantSizes.length; i++) {
                const size = variantSizes[i] || null;
                const color = variantColors[i] || null;
                const regularPrice = parseFloat(variantRegularPrices[i]);
                const salePrice = variantSalePrices[i] ? parseFloat(variantSalePrices[i]) : null;
                const stockQuantity = parseInt(variantStockQuantities[i]);

                if (!regularPrice || !stockQuantity) {
                    return res.status(400).json({ success: false, message: 'Regular price and stock quantity are required for each variant' });
                }

                // Validate sale price is less than regular price
                if (salePrice && salePrice >= regularPrice) {
                    return res.status(400).json({ success: false, message: 'Sale price must be less than regular price for all variants' });
                }

                const variantInsertQuery = `
                    INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                await new Promise((resolve, reject) => {
                    db.run(
                        variantInsertQuery,
                        [productId, size, color, regularPrice, salePrice, stockQuantity],
                        (err) => {
                            if (err) return reject(err);
                            resolve();
                        }
                    );
                });
            }

            // Handle image uploads
            if (req.files && req.files.length > 0) {
                // Delete existing images
                await new Promise((resolve, reject) => {
                    db.run(`DELETE FROM product_images WHERE product_id = ?`, [productId], (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                // Insert new images
                const imagePromises = req.files.map((file, index) => {
                    return new Promise((resolve, reject) => {
                        db.run(
                            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, ?)`,
                            [productId, `/uploads/products/${file.filename}`, index === 0 ? 1 : 0],
                            (err) => {
                                if (err) return reject(err);
                                resolve();
                            }
                        );
                    });
                });
                await Promise.all(imagePromises);
            }

            res.status(200).json({ success: true, message: 'Product updated successfully', redirect: '/shop-products' });
        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
];

// Fetch vendor customers
const getVendorCustomers = async (req, res) => {
    if (!req.session.vendor) {
        return res.redirect('/service_provider_login');
    }

    const vendorId = req.session.vendor.id;

    try {
        // Query to fetch customers who have placed orders with the vendor
        const customersQuery = `
            SELECT 
                u.id AS customer_id,
                u.user_name,
                u.user_email AS email,
                COUNT(DISTINCT o.id) AS total_orders,
                SUM(o.total_amount) AS total_spent,
                MAX(o.order_date) AS last_order_date
            FROM users u
            JOIN orders o ON u.id = o.user_id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE p.vendor_id = ?
            GROUP BY u.id, u.user_name, u.user_email
            ORDER BY last_order_date DESC
        `;

        const customers = await new Promise((resolve, reject) => {
            db.all(customersQuery, [vendorId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        // Format the customer data for the template
        const formattedCustomers = customers.map((customer, index) => ({
            customer_id: `C${String(index + 1).padStart(3, '0')}`, // Generate a customer ID like C001, C002, etc.
            user_id: customer.customer_id, // Actual user ID for linking to details
            name: customer.user_name,
            email: customer.email,
            total_orders: customer.total_orders,
            total_spent: customer.total_spent ? customer.total_spent.toFixed(2) : '0.00',
            last_order: customer.last_order_date
                ? new Date(customer.last_order_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                  })
                : 'N/A'
        }));

        res.render('shop-customers', {
            vendor: req.session.vendor,
            customers: formattedCustomers
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).send('Server error');
    }
};

// Submit new product
const submitProduct = [
    upload.array('product_images', 4), // Allow up to 4 images
    async (req, res) => {
        if (!req.session.vendor) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const vendorId = req.session.vendor.id;
        const {
            product_name,
            product_category,
            product_type,
            product_description,
            stock_status,
            variant_size,
            variant_color,
            variant_regular_price,
            variant_sale_price,
            variant_stock_quantity
        } = req.body;

        // Validate required fields
        if (!product_name || !product_category || !product_type || !product_description || !stock_status) {
            return res.status(400).json({ success: false, message: 'All basic information fields are required' });
        }

        if (!variant_size || !variant_regular_price || !variant_stock_quantity) {
            return res.status(400).json({ success: false, message: 'Size, regular price, and stock quantity are required' });
        }

        // Validate stock_status
        if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
            return res.status(400).json({ success: false, message: 'Invalid stock status' });
        }

        const size = variant_size.trim();
        const color = variant_color ? variant_color.trim() : null;
        const regularPrice = parseFloat(variant_regular_price);
        const salePrice = variant_sale_price ? parseFloat(variant_sale_price) : null;
        const stockQuantity = parseInt(variant_stock_quantity);

        // Validate regular price and stock quantity
        if (isNaN(regularPrice) || regularPrice <= 0) {
            return res.status(400).json({ success: false, message: 'Regular price must be a positive number' });
        }
        if (isNaN(stockQuantity) || stockQuantity < 0) {
            return res.status(400).json({ success: false, message: 'Stock quantity must be a non-negative number' });
        }

        // Validate sale price is less than regular price
        if (salePrice && salePrice >= regularPrice) {
            return res.status(400).json({ success: false, message: 'Sale price must be less than regular price' });
        }

        try {
            // Insert the product into the products table
            const productInsertQuery = `
                INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, stock_status)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const productResult = await new Promise((resolve, reject) => {
                db.run(
                    productInsertQuery,
                    [vendorId, product_name, product_category, product_type, product_description, stock_status],
                    function (err) {
                        if (err) return reject(err);
                        resolve(this.lastID); // Get the inserted product ID
                    }
                );
            });

            const productId = productResult;

            // Insert the single variant into the product_variants table
            const variantInsertQuery = `
                INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await new Promise((resolve, reject) => {
                db.run(
                    variantInsertQuery,
                    [productId, size, color, regularPrice, salePrice, stockQuantity],
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });

            // Insert images into the product_images table
            if (req.files && req.files.length > 0) {
                const imagePromises = req.files.map((file, index) => {
                    return new Promise((resolve, reject) => {
                        const imageInsertQuery = `
                            INSERT INTO product_images (product_id, image_path, is_primary)
                            VALUES (?, ?, ?)
                        `;
                        db.run(
                            imageInsertQuery,
                            [productId, `/uploads/products/${file.filename}`, index === 0 ? 1 : 0],
                            (err) => {
                                if (err) return reject(err);
                                resolve();
                            }
                        );
                    });
                });
                await Promise.all(imagePromises);
            }

            res.status(200).json({ success: true, message: 'Product added successfully', redirect: '/shop-products' });
        } catch (error) {
            console.error('Error adding product:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
];

// Export all controllers, including submitProduct
module.exports = { storeSignup, serviceProviderLogin, getVendorDashboard, logout, getVendorProfile, getVendorProducts, getProductForEdit, updateProduct, getVendorOrders, getVendorCustomers, submitProduct };