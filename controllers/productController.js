// controllers/productController.js
const { db } = require('../models/database');
const multer = require('multer');
const path = require('path');

const productImageStorage = multer.diskStorage({
    destination: 'uploads/products/',
    filename: (req, file, cb) => cb(null, `product_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadProductImages = multer({
    storage: productImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) return cb(new Error('Only image files are allowed!'), false);
        cb(null, true);
    }
}).array('product-images', 10);

const getPetAccessories = (req, res) => {
    db.all(`
        SELECT p.id, p.product_name, p.product_type, p.product_category, 
               MIN(pv.regular_price) as min_regular_price, 
               MIN(pv.sale_price) as min_sale_price,
               pi.image_path
        FROM products p
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
        GROUP BY p.id, p.product_name, p.product_type, p.product_category, pi.image_path
        ORDER BY p.created_at DESC
    `, [], (err, products) => {
        if (err) return res.status(500).send('Server error');

        // Fetch filter options from product_variants
        const filterQueries = {
            productTypes: "SELECT DISTINCT product_type FROM products WHERE product_type IS NOT NULL",
            colors: "SELECT DISTINCT color FROM product_variants WHERE color IS NOT NULL",
            sizes: "SELECT DISTINCT size FROM product_variants WHERE size IS NOT NULL",
            maxPrice: "SELECT MAX(regular_price) as max_price FROM product_variants"
        };

        const filters = {};
        let completedQueries = 0;
        const totalQueries = Object.keys(filterQueries).length;

        const processFilterResults = () => {
            if (++completedQueries === totalQueries) {
                res.render('pet_accessory', { 
                    user: req.session.user || null, 
                    products: products || [], 
                    filters,
                    productsData: JSON.stringify(products || [])
                });
            }
        };

        db.all(filterQueries.productTypes, [], (err, rows) => {
            if (err) console.error('Error fetching product types:', err);
            filters.productTypes = rows ? rows.map(row => row.product_type) : [];
            processFilterResults();
        });

        db.all(filterQueries.colors, [], (err, rows) => {
            if (err) console.error('Error fetching colors:', err);
            filters.colors = rows ? rows.map(row => row.color) : [];
            processFilterResults();
        });

        db.all(filterQueries.sizes, [], (err, rows) => {
            if (err) console.error('Error fetching sizes:', err);
            filters.sizes = rows ? rows.map(row => row.size) : [];
            processFilterResults();
        });

        db.get(filterQueries.maxPrice, [], (err, row) => {
            if (err) console.error('Error fetching max price:', err);
            filters.maxPrice = row && row.max_price ? row.max_price : 15000;
            processFilterResults();
        });
    });
};

// Rest of the controller remains unchanged
const submitProduct = (req, res) => {
    uploadProductImages(req, res, (err) => {
        if (err instanceof multer.MulterError) return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        if (err) return res.status(500).json({ success: false, message: `Server error: ${err.message}` });

        const {
            product_name, product_category, product_type, product_description,
            variant_size, variant_color, variant_regular_price, variant_sale_price, variant_stock_quantity
        } = req.body;

        if (!product_name || !product_category || !product_type || !product_description || !variant_size) {
            return res.status(400).json({ success: false, message: 'Required fields are missing' });
        }

        db.run(
            `INSERT INTO products (vendor_id, product_name, product_category, product_type, product_description, stock_status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.vendor.id, product_name, product_category, product_type, product_description, 'In Stock'],
            function(err) {
                if (err) return res.status(500).json({ success: false, message: 'Failed to save product' });

                const productId = this.lastID;
                const variants = variant_size.map((size, i) => ({
                    size: size || null,
                    color: variant_color[i] || null,
                    regular_price: parseFloat(variant_regular_price[i]),
                    sale_price: variant_sale_price[i] ? parseFloat(variant_sale_price[i]) : null,
                    stock_quantity: parseInt(variant_stock_quantity[i])
                }));

                const variantStmt = db.prepare(
                    `INSERT INTO product_variants (product_id, size, color, regular_price, sale_price, stock_quantity) 
                     VALUES (?, ?, ?, ?, ?, ?)`
                );

                variants.forEach(variant => {
                    variantStmt.run([productId, variant.size, variant.color, variant.regular_price, variant.sale_price, variant.stock_quantity]);
                });

                variantStmt.finalize(err => {
                    if (err) return res.status(500).json({ success: false, message: 'Failed to save variants' });

                    if (req.files && req.files.length > 0) {
                        const imageValues = req.files.map((file, i) => [productId, `/uploads/products/${file.filename}`, i === 0 ? 1 : 0]);
                        db.run(
                            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES ${imageValues.map(() => '(?, ?, ?)').join(', ')}`,
                            imageValues.flat(),
                            (err) => {
                                if (err) return res.status(500).json({ success: false, message: 'Failed to save images' });
                                res.status(201).json({ success: true, message: 'Product added successfully' });
                            }
                        );
                    } else {
                        res.status(201).json({ success: true, message: 'Product added successfully (no images)' });
                    }
                });
            }
        );
    });
};

const getVendorProducts = (req, res) => {
    db.all(
        `SELECT p.*, 
         (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
         FROM products p WHERE p.vendor_id = ? ORDER BY p.created_at DESC`,
        [req.session.vendor.id],
        (err, products) => {
            if (err) return res.status(500).json({ success: false, message: 'Failed to fetch products' });
            res.json({ success: true, products });
        }
    );
};

const getProduct = (req, res) => {
    const productId = req.params.id;
    db.get(
        `SELECT id, product_name, product_type, product_category, product_description 
         FROM products WHERE id = ?`,
        [productId],
        (err, product) => {
            if (err) return res.status(500).send('Server error');
            if (!product) return res.status(404).send('Product not found');

            db.all(
                `SELECT size, color, regular_price, sale_price, stock_quantity 
                 FROM product_variants WHERE product_id = ?`,
                [productId],
                (err, variants) => {
                    if (err) return res.status(500).send('Server error');

                    db.get(
                        `SELECT image_path FROM product_images WHERE product_id = ? AND is_primary = 1`,
                        [productId],
                        (err, image) => {
                            if (err) return res.status(500).send('Server error');

                            const productData = {
                                id: product.id.toString(),
                                product_name: product.product_name,
                                product_type: product.product_type,
                                variants: variants.map(v => ({
                                    size: v.size,
                                    color: v.color,
                                    regular_price: v.regular_price,
                                    sale_price: v.sale_price,
                                    stock_quantity: v.stock_quantity
                                })),
                                image_path: image ? image.image_path : '/images/default-product.jpg'
                            };

                            res.render('pet_product_details', { 
                                product: productData,
                                productJSON: JSON.stringify(productData), 
                                user: req.session.user || null 
                            });
                        }
                    );
                }
            );
        }
    );
};

const updateProduct = (req, res) => {
    const productId = req.params.id;

    db.get('SELECT vendor_id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (product.vendor_id !== req.session.vendor.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        uploadProductImages(req, res, (err) => {
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
                function (err) {
                    if (err) return res.status(500).json({ success: false, message: 'Failed to update product' });

                    if (req.files && req.files.length > 0) {
                        const imageValues = req.files.map(file => [productId, `/uploads/products/${file.filename}`, 0]);
                        const placeholders = imageValues.map(() => '(?, ?, ?)').join(', ');
                        const flatValues = imageValues.flat();

                        db.run(
                            `INSERT INTO product_images (product_id, image_path, is_primary) VALUES ${placeholders}`,
                            flatValues,
                            (err) => {
                                if (err) return res.status(500).json({ success: false, message: 'Failed to save new images' });
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
};

const deleteProduct = (req, res) => {
    const productId = req.params.id;

    db.get('SELECT vendor_id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (product.vendor_id !== req.session.vendor.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        db.run('DELETE FROM product_images WHERE product_id = ?', [productId], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Failed to delete product images' });

            db.run('DELETE FROM products WHERE id = ?', [productId], (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Failed to delete product' });
                res.json({ success: true, message: 'Product deleted successfully' });
            });
        });
    });
};

const deleteProductImage = (req, res) => {
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
            if (image.vendor_id !== req.session.vendor.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

            db.run('DELETE FROM product_images WHERE id = ?', [imageId], (err) => {
                if (err) return res.status(500).json({ success: false, message: 'Failed to delete image' });
                res.json({ success: true, message: 'Image deleted successfully' });
            });
        }
    );
};



const checkout = (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    const { cart } = req.body;
    if (!cart || cart.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });

    console.log('Cart data received:', JSON.stringify(cart, null, 2));

    const userId = req.session.user.id;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    db.run(
        `INSERT INTO orders (user_id, status, subtotal, total_amount) VALUES (?, ?, ?, ?)`,
        [userId, 'Pending', subtotal, subtotal],
        function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Failed to create order' });

            const orderId = this.lastID;
            const orderItems = cart.map(item => [
                orderId,
                item.productId || null,
                item.variant_id || null, // Assuming cart includes variant_id
                item.product_name,
                item.quantity,
                item.price,
                item.size || null,
                item.color || null
            ]);

            db.run(
                `INSERT INTO order_items (order_id, product_id, variant_id, product_name, quantity, price, size, color) 
                 VALUES ${orderItems.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
                orderItems.flat(),
                (err) => {
                    if (err) return res.status(500).json({ success: false, message: 'Failed to save order items' });
                    res.json({ success: true, orderId });
                }
            );
        }
    );
};

// Add getUserOrders function
const getUserOrders = (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    const userId = req.session.user.id;
    db.all(`
        SELECT o.id as order_id, o.order_date, o.status, o.subtotal, o.total_amount, o.delivery_date,
               oi.product_id, oi.variant_id, oi.product_name, oi.quantity, oi.price, oi.size, oi.color,
               pi.image_path
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN product_images pi ON oi.product_id = pi.product_id AND pi.is_primary = 1
        WHERE o.user_id = ?
        ORDER BY o.order_date DESC
    `, [userId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to fetch orders' });

        const orders = [];
        rows.forEach(row => {
            let order = orders.find(o => o.order_id === row.order_id);
            if (!order) {
                order = {
                    order_id: row.order_id,
                    order_date: row.order_date,
                    status: row.status,
                    subtotal: row.subtotal,
                    total_amount: row.total_amount,
                    delivery_date: row.delivery_date,
                    items: []
                };
                orders.push(order);
            }
            order.items.push({
                product_id: row.product_id,
                variant_id: row.variant_id,
                product_name: row.product_name,
                quantity: row.quantity,
                price: row.price,
                size: row.size,
                color: row.color,
                image_path: row.image_path || '/images/default-product.jpg'
            });
        });
        res.json({ success: true, orders });
    });
};

// Add reorder function
const reorder = (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    const orderId = req.params.orderId;
    const userId = req.session.user.id;

    db.all(
        `SELECT oi.product_id, oi.variant_id, oi.product_name, oi.quantity, oi.price, oi.size, oi.color, pi.image_path
         FROM order_items oi
         LEFT JOIN product_images pi ON oi.product_id = pi.product_id AND pi.is_primary = 1
         WHERE oi.order_id = ?`,
        [orderId],
        (err, items) => {
            if (err) return res.status(500).json({ success: false, message: 'Failed to fetch order items' });
            if (items.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });

            // Here, you could add items to a server-side cart or return them for client-side handling
            res.json({ success: true, cart: items });
        }
    );
};



module.exports = { 
    getPetAccessories, 
    submitProduct, 
    getVendorProducts, 
    getProduct, 
    updateProduct, 
    deleteProduct, 
    deleteProductImage,
    checkout,           
    getUserOrders,      
    reorder  
};