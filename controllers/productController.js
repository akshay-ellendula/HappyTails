const { Product, ProductVariant, ProductImage, Order, OrderItem } = require('../models/database');
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
                    as: 'images',
                    pipeline: [{ $match: { is_primary: true } }]
                }
            },
            {
                $project: {
                    id: '$_id',
                    product_name: 1,
                    product_type: 1,
                    product_category: 1,
                    min_regular_price: { $min: '$variants.regular_price' },
                    min_sale_price: { $min: '$variants.sale_price' },
                    image_path: { $arrayElemAt: ['$images.image_path', 0] }
                }
            },
            { $sort: { created_at: -1 } }
        ]);

        const filters = {
            productTypes: await Product.distinct('product_type'),
            colors: await ProductVariant.distinct('color'),
            sizes: await ProductVariant.distinct('size'),
            maxPrice: (await ProductVariant.find().sort({ regular_price: -1 }).limit(1))[0]?.regular_price || 15000
        };

        res.render('pet_accessory', { 
            user: req.session.user || null, 
            products: products || [], 
            filters,
            productsData: JSON.stringify(products || [])
        });
    } catch (error) {
        res.status(500).send('Server error');
    }
};

const submitProduct = (req, res) => {
    uploadProductImages(req, res, async (err) => {
        if (err instanceof multer.MulterError) return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        if (err) return res.status(500).json({ success: false, message: `Server error: ${err.message}` });

        try {
            const {
                product_name, product_category, product_type, product_description,
                variant_size, variant_color, variant_regular_price, variant_sale_price, variant_stock_quantity
            } = req.body;

            if (!product_name || !product_category || !product_type || !product_description || !variant_size) {
                return res.status(400).json({ success: false, message: 'Required fields are missing' });
            }

            const product = new Product({
                vendor_id: req.session.vendor.id,
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status: 'In Stock'
            });
            await product.save();

            const variants = variant_size.map((size, i) => ({
                product_id: product._id,
                size: size || null,
                color: variant_color[i] || null,
                regular_price: parseFloat(variant_regular_price[i]),
                sale_price: variant_sale_price[i] ? parseFloat(variant_sale_price[i]) : null,
                stock_quantity: parseInt(variant_stock_quantity[i])
            }));

            await ProductVariant.insertMany(variants);

            if (req.files && req.files.length > 0) {
                const images = req.files.map((file, i) => ({
                    product_id: product._id,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: i === 0 ? true : false
                }));
                await ProductImage.insertMany(images);
                res.status(201).json({ success: true, message: 'Product added successfully' });
            } else {
                res.status(201).json({ success: true, message: 'Product added successfully (no images)' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Failed to save product' });
        }
    });
};

const getVendorProducts = async (req, res) => {
    try {
        const products = await Product.aggregate([
            { $match: { vendor_id: req.session.vendor.id } },
            {
                $lookup: {
                    from: 'productimages',
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'images',
                    pipeline: [{ $match: { is_primary: true } }, { $limit: 1 }]
                }
            },
            {
                $project: {
                    primary_image: { $arrayElemAt: ['$images.image_path', 0] }
                }
            },
            { $sort: { created_at: -1 } }
        ]);
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
};

const getProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId)
            .select('product_name product_type product_category product_description');
        if (!product) return res.status(404).send('Product not found');

        const variants = await ProductVariant.find({ product_id: parseInt(productId) })
            .select('size color regular_price sale_price stock_quantity');
        const image = await ProductImage.findOne({ product_id: parseInt(productId), is_primary: true })
            .select('image_path');

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
            image_path: image ? image.image_path : '/images/default-product.jpg'
        };

        res.render('pet_product_details', { 
            product: productData,
            productJSON: JSON.stringify(productData), 
            user: req.session.user || null 
        });
    } catch (error) {
        res.status(500).send('Server error');
    }
};

const updateProduct = (req, res) => {
    const productId = req.params.id;

    Product.findById(productId, (err, product) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (product.vendor_id !== req.session.vendor.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        uploadProductImages(req, res, async (err) => {
            if (err) return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });

            try {
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

                await Product.findByIdAndUpdate(productId, {
                    product_name: productName,
                    product_category: productCategory,
                    product_type: productType,
                    product_description: productDescription,
                    regular_price: regularPrice,
                    sale_price: salePrice || null,
                    sku,
                    stock_quantity: stockQuantity,
                    stock_status: stockStatus,
                    color,
                    size,
                    material,
                    weight
                });

                if (req.files && req.files.length > 0) {
                    const images = req.files.map(file => ({
                        product_id: parseInt(productId),
                        image_path: `/uploads/products/${file.filename}`,
                        is_primary: false
                    }));
                    await ProductImage.insertMany(images);
                    res.json({ success: true, message: 'Product updated successfully' });
                } else {
                    res.json({ success: true, message: 'Product updated successfully (no new images)' });
                }
            } catch (error) {
                res.status(500).json({ success: false, message: 'Failed to update product' });
            }
        });
    });
};

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (product.vendor_id !== req.session.vendor.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        await ProductImage.deleteMany({ product_id: parseInt(productId) });
        await Product.findByIdAndDelete(productId);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
};

const deleteProductImage = async (req, res) => {
    try {
        const imageId = req.params.id;
        const image = await ProductImage.findById(imageId).populate('product_id');
        if (!image) return res.status(404).json({ success: false, message: 'Image not found' });
        if (image.product_id.vendor_id !== req.session.vendor.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        await ProductImage.findByIdAndDelete(imageId);
        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete image' });
    }
};

const checkout = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    const { cart } = req.body;
    if (!cart || cart.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });

    console.log('Cart data received:', JSON.stringify(cart, null, 2));

    try {
        const userId = req.session.user.id;
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // Validate stock quantity for each item
        for (const item of cart) {
            const variant = await ProductVariant.findOne({ product_id: parseInt(item.product_id), _id: item.variant_id });
            if (!variant || variant.stock_quantity < item.quantity) {
                throw new Error(`Not enough stock for ${item.product_name} (Size: ${item.size || 'N/A'}, Color: ${item.color || 'N/A'})`);
            }
        }

        // Create the order
        const order = new Order({
            user_id: userId,
            order_date: new Date(),
            status: 'Pending',
            subtotal,
            total_amount: subtotal
        });
        await order.save();

        // Create order items
        const orderItems = cart.map(item => ({
            order_id: order._id,
            product_id: parseInt(item.product_id) || null,
            variant_id: item.variant_id || null,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null,
            color: item.color || null
        }));
        await OrderItem.insertMany(orderItems);

        // Update stock quantities
        for (const item of cart) {
            await ProductVariant.findOneAndUpdate(
                { product_id: parseInt(item.product_id), _id: item.variant_id },
                { $inc: { stock_quantity: -item.quantity } }
            );
        }

        res.json({ success: true, message: 'Order placed successfully', orderId: order._id });
    } catch (error) {
        console.error('Checkout error:', error.message);
        res.status(error.message.includes('Not enough stock') ? 400 : 500).json({ success: false, message: error.message });
    }
};

const getUserOrders = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    try {
        const userId = req.session.user.id;
        const orders = await Order.aggregate([
            { $match: { user_id: parseInt(userId) } },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'items'
                }
            },
            {
                $lookup: {
                    from: 'productimages',
                    localField: 'items.product_id',
                    foreignField: 'product_id',
                    as: 'images',
                    pipeline: [{ $match: { is_primary: true } }]
                }
            },
            { $sort: { order_date: -1 } }
        ]);

        const formattedOrders = orders.map(order => ({
            order_id: order._id,
            order_date: order.order_date,
            status: order.status,
            subtotal: order.subtotal,
            total_amount: order.total_amount,
            delivery_date: order.delivery_date,
            items: order.items.map(item => ({
                product_id: item.product_id,
                variant_id: item.variant_id,
                product_name: item.product_name,
                quantity: item.quantity,
                price: item.price,
                size: item.size,
                color: item.color,
                image_path: order.images.find(img => img.product_id.toString() === item.product_id.toString())?.image_path || '/images/default-product.jpg'
            }))
        }));

        res.json({ success: true, orders: formattedOrders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
};

const reorder = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    try {
        const orderId = req.params.orderId;
        const items = await OrderItem.aggregate([
            { $match: { order_id: parseInt(orderId) } },
            {
                $lookup: {
                    from: 'productimages',
                    localField: 'product_id',
                    foreignField: 'product_id',
                    as: 'images',
                    pipeline: [{ $match: { is_primary: true } }]
                }
            }
        ]);

        if (items.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });

        const formattedItems = items.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
            color: item.color,
            image_path: item.images[0]?.image_path || '/images/default-product.jpg'
        }));

        res.json({ success: true, cart: formattedItems });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch order items' });
    }
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