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
    try {
        // Check if user is logged in
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please login to checkout' 
            });
        }

        // Check for required user profile fields
        const user = req.session.user;
        if (!user.user_name || !user.user_email || !user.user_phone || !user.user_address) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please complete your profile information before proceeding to checkout.' 
            });
        }

        const { cart } = req.body;
        
        // Validate cart
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cart is empty' 
            });
        }

        // Clean cart data - remove image_data and ensure proper structure
        const cleanCart = cart.map(item => ({
            product_id: item.product_id || null,
            variant_id: item.variant_id || null,
            product_name: item.product_name,
            quantity: parseInt(item.quantity) || 1,
            price: parseFloat(item.price) || 0,
            size: item.size || null,
            color: item.color || null
        }));

        // Validate cart items have required fields
        const invalidItems = cleanCart.filter(item => 
            !item.product_id || !item.product_name || item.quantity <= 0 || item.price <= 0
        );

        if (invalidItems.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid cart items detected' 
            });
        }

        // Calculate totals
        const subtotal = cleanCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const charge = subtotal * 0.04;
        const total = subtotal + charge;

        // Store in session
        req.session.cart = cleanCart;
        req.session.orderTotals = { 
            subtotal: parseFloat(subtotal.toFixed(2)), 
            charge: parseFloat(charge.toFixed(2)), 
            total: parseFloat(total.toFixed(2)) 
        };

        console.log('Checkout successful - Redirecting to payment');
        return res.json({ 
            success: true, 
            redirectUrl: '/payment' 
        });

    } catch (err) {
        console.error('Checkout error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error during checkout' 
        });
    }
};

const processPayment = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not logged in' 
            });
        }

        const { cardNumber, expiryDate, cvc } = req.body;
        const cart = req.session.cart;
        const orderTotals = req.session.orderTotals;

        // Validate all required data
        if (!cart || !orderTotals || !cardNumber) {
            console.error('Missing session data:', { 
                hasCart: !!cart, 
                hasOrderTotals: !!orderTotals,
                hasCardNumber: !!cardNumber 
            });
            return res.status(400).json({ 
                success: false, 
                message: 'Session data missing. Please restart checkout.' 
            });
        }

        // Validate card number (basic validation)
        const cleanCardNumber = cardNumber.replace(/\s/g, '');
        if (cleanCardNumber.length !== 16 || isNaN(cleanCardNumber)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid card number' 
            });
        }

        const paymentLastFour = cleanCardNumber.slice(-4);

        // Create order with transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.create([{
                user_id: req.session.user.id,
                order_date: new Date(),
                status: 'Pending',
                subtotal: orderTotals.subtotal,
                total_amount: orderTotals.total,
                payment_last_four: paymentLastFour
            }], { session });

            // Create order items
            const orderItems = cart.map(item => ({
                order_id: order[0]._id,
                product_id: item.product_id || null,
                variant_id: item.variant_id || null,
                product_name: item.product_name,
                quantity: item.quantity,
                price: item.price,
                size: item.size || null,
                color: item.color || null
            }));

            await OrderItem.insertMany(orderItems, { session });

            // Commit transaction
            await session.commitTransaction();
            
            // Clear session
            req.session.cart = null;
            req.session.orderTotals = null;

            console.log('Payment processed successfully for order:', order[0]._id);
            return res.json({ 
                success: true, 
                redirectUrl: '/my_orders' 
            });

        } catch (transactionError) {
            await session.abortTransaction();
            throw transactionError;
        } finally {
            session.endSession();
        }

    } catch (err) {
        console.error('Payment processing error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Error processing payment. Please try again.' 
        });
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