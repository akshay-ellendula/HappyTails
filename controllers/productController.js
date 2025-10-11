const {
    Product,
    ProductVariant,
    ProductImage,
    Order,
    OrderItem
} = require('../models/database');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

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

const getPetAccessories = async (req, res) => {
    try {
        const products = await Product.aggregate([
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variants'
                }
            },
            {
                $lookup: {
                    from: 'productimages',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'images'
                }
            },
            {
                $unwind: {
                    path: '$images',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $match: { 'images.is_primary': true } },
            {
                $project: {
                    id: { $toString: '$_id' },
                    product_name: 1,
                    product_type: { $toLower: { $trim: { input: '$product_type' } } }, // Normalize product_type
                    product_category: 1,
                    variants: {
                        $map: {
                            input: '$variants',
                            as: 'variant',
                            in: {
                                size: { $toLower: { $trim: { input: '$$variant.size' } } },
                                color: { $toLower: { $trim: { input: '$$variant.color' } } },
                                regular_price: '$$variant.regular_price',
                                sale_price: '$$variant.sale_price'
                            }
                        }
                    },
                    image_data: '$images.image_data',
                    _id: 0
                }
            },
            { $sort: { created_at: -1 } }
        ]);

        // Normalize product types, colors, and sizes as before
        const productTypesRaw = await Product.aggregate([
            { $match: { product_type: { $ne: null } } },
            {
                $group: {
                    _id: { $toLower: { $trim: { input: '$product_type' } } }
                }
            },
            {
                $project: {
                    _id: 0,
                    product_type: '$_id'
                }
            }
        ]);
        const productTypes = productTypesRaw.map(item => item.product_type).sort();

        const colorsRaw = await ProductVariant.aggregate([
            { $match: { color: { $ne: null } } },
            {
                $group: {
                    _id: { $toLower: { $trim: { input: '$color' } } }
                }
            },
            {
                $project: {
                    _id: 0,
                    color: '$_id'
                }
            }
        ]);
        const colors = colorsRaw.map(item => item.color).sort();

        const sizesRaw = await ProductVariant.aggregate([
            { $match: { size: { $ne: null } } },
            {
                $group: {
                    _id: { $toLower: { $trim: { input: '$size' } } }
                }
            },
            {
                $project: {
                    _id: 0,
                    size: '$_id'
                }
            }
        ]);
        const sizes = sizesRaw.map(item => item.size).sort();

        const maxPriceResult = await ProductVariant.find().sort({ regular_price: -1 }).limit(1);
        const maxPrice = maxPriceResult.length > 0 ? maxPriceResult[0].regular_price : 15000;

        const filters = {
            productTypes,
            colors,
            sizes,
            maxPrice
        };

        res.render('pet_accessory', {
            user: req.session.user || null,
            products: products || [],
            filters,
            productsData: JSON.stringify(products || [])
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
};





const getProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId)
            .select('id product_name product_type product_category product_description');
        if (!product) return res.status(404).send('Product not found');

        const variants = await ProductVariant.find({ product_id: productId })
            .select('id size color regular_price sale_price stock_quantity');
        const image = await ProductImage.findOne({ product_id: productId, is_primary: true })
            .select('image_data');

        const productData = {
            id: product._id.toString(),
            product_name: product.product_name,
            product_type: product.product_type,
            product_category: product.product_category,
            product_description: product.product_description,
            variants: variants.map(v => ({
                variant_id: v._id,
                size: v.size,
                color: v.color,
                regular_price: v.regular_price,
                sale_price: v.sale_price,
                stock_quantity: v.stock_quantity
            })),
            image_data: image ? image.image_data : null
        };

        res.render('pet_product_details', {
            product: productData,
            productJSON: JSON.stringify(productData),
            user: req.session.user || null
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
};


const checkout = async (req, res) => {
    // Check for required user profile fields
    const user = req.session.user;
    if (!user.user_name || !user.user_email || !user.user_phone || !user.user_address) {
        // Return a 400 Bad Request status with a message
        return res.status(400).send('Please complete your profile information before proceeding to checkout.');
    }

    const { cart } = req.body;
    if (!cart.length === 0) return res.status(400).send('Cart is empty');

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const charge = subtotal * 0.04;
    const total = subtotal + charge;

    req.session.cart = cart;
    req.session.orderTotals = { subtotal, charge, total };

    res.redirect('/payment');
};

const processPayment = async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/my_login');
    }

    const { cardNumber } = req.body;
    const cart = req.session.cart;
    const { subtotal, total } = req.session.orderTotals;

    if (!cart || !subtotal || !total || !cardNumber) {
        return res.status(400).send('Session data or card number missing.');
    }

    try {
        const paymentLastFour = cardNumber.slice(-4);
        

        // Create a new order in the database
        const order = await Order.create({
            user_id: req.session.user.id,
            order_date: new Date(),
            status: 'Pending',
            subtotal: subtotal,
            total_amount: total,
            payment_last_four: paymentLastFour
        });

        // Add each cart item to the OrderItem collection
        const orderItems = cart.map(item => ({
            order_id: order._id,
            product_id: item.product_id || null,
            variant_id: item.variant_id || null,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null,
            color: item.color || null
        }));

        await OrderItem.insertMany(orderItems);
        for (const item of cart) {
            // Ensure we have a specific variant ID to update
            if (item.variant_id) {
                // Find the specific variant by its unique ID and decrease its stock
                await ProductVariant.updateOne(
                    { _id: item.variant_id },
                    { $inc: { stock_quantity: -item.quantity } }
                );
            }
        }
        
        // Clear the session cart
        req.session.cart = null;
        req.session.orderTotals = null;

        // Redirect to a confirmation page or user orders page
        res.redirect('/my_orders');

    } catch (err) {
        console.error('Payment processing error:', err);
        res.status(500).send('Error processing payment.');
    }
};

const getUserOrders = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    try {
        const orders = await Order.find({ user_id: req.session.user.id })
            .sort({ order_date: -1 })
            .lean();

        const populatedOrders = await Promise.all(orders.map(async order => {
            const items = await OrderItem.find({ order_id: order._id }).lean();

            const detailedItems = await Promise.all(items.map(async item => {
                const imageDoc = await ProductImage.findOne({ product_id: item.product_id, is_primary: true });
                return {
                    ...item,
                    image_data: imageDoc?.image_data || '/images/default-product.jpg'
                };
            }));

            return {
                ...order,
                id: order._id.toString(),
                items: detailedItems
            };
        }));

        res.json({ success: true, orders: populatedOrders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
};

const reorder = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    try {
        const orderId = req.params.orderId;
        const items = await OrderItem.find({ order_id: orderId }).lean();

        if (items.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });

        // Get product images for each item
        const cartItems = await Promise.all(items.map(async (item) => {
            const imageDoc = await ProductImage.findOne({ 
                product_id: item.product_id, 
                is_primary: true 
            });
            
            return {
                product_id: item.product_id ? item.product_id.toString() : null,
                variant_id: item.variant_id ? item.variant_id.toString() : null,
                product_name: item.product_name,
                quantity: item.quantity,
                price: item.price,
                size: item.size || null,
                color: item.color || null,
                image_data: imageDoc ? imageDoc.image_data : null
            };
        }));

        res.json({ success: true, cart: cartItems });
    } catch (err) {
        console.error('Reorder error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch order items' });
    }
};

const getPaymentPage = (req, res) => {
    const { orderTotals } = req.session;
    if (orderTotals) {
        res.render('payment', {
            user: req.session.user || null,
            subtotal: orderTotals.subtotal.toFixed(2),
            charge: orderTotals.charge.toFixed(2),
            total: orderTotals.total.toFixed(2)
        });
    } else {
        // Redirect to the cart page if no order data is found in the session
        res.redirect('/pet_accessory'); 
    }
};

module.exports = {
    getPetAccessories,
    getProduct,
    checkout,
    processPayment,
    getUserOrders,
    reorder,
    getPaymentPage,
};