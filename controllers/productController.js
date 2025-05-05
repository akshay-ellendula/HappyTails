const {
    Product,
    ProductVariant,
    ProductImage,
    Order,
    OrderItem
} = require('../models/database');
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
                $group: {
                    _id: '$_id',
                    id: { $first: '$_id' },
                    product_name: { $first: '$product_name' },
                    product_type: { $first: '$product_type' },
                    product_category: { $first: '$product_category' },
                    min_regular_price: { $min: '$variants.regular_price' },
                    min_sale_price: { $min: '$variants.sale_price' },
                    image_path: { $first: '$images.image_path' }
                }
            },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    product_name: 1,
                    product_type: 1,
                    product_category: 1,
                    min_regular_price: 1,
                    min_sale_price: 1,
                    image_path: 1
                }
            },
            { $sort: { created_at: -1 } }
        ]);

        const productTypes = await Product.distinct('product_type', { product_type: { $ne: null } });
        const colors = await ProductVariant.distinct('color', { color: { $ne: null } });
        const sizes = await ProductVariant.distinct('size', { size: { $ne: null } });
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

const submitProduct = async (req, res) => {
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

            const product = await Product.create({
                vendor_id: req.session.vendor.id,
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status: 'In Stock'
            });

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
        } catch (err) {
            res.status(500).json({ success: false, message: 'Failed to save product' });
        }
    });
};

const getVendorProducts = async (req, res) => {
    try {
        const products = await Product.aggregate([
            { $match: { vendor_id: mongoose.Types.ObjectId(req.session.vendor.id) } },
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
                    id: '$_id',
                    product_name: 1,
                    product_category: 1,
                    product_type: 1,
                    product_description: 1,
                    sku: 1,
                    stock_status: 1,
                    created_at: 1,
                    primary_image: '$images.image_path',
                    _id: 0
                }
            },
            { $sort: { created_at: -1 } }
        ]);
        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
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
    } catch (err) {
        res.status(500).send('Server error');
    }
};

const updateProduct = (req, res) => {
    const productId = req.params.id;

    Product.findById(productId)
        .select('vendor_id')
        .then(product => {
            if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
            if (product.vendor_id.toString() !== req.session.vendor.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

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

                    // Note: The original schema doesn't have fields like regular_price, sale_price, etc., directly in products
                    // We'll assume these fields are in product_variants, but since the original code updates the product table,
                    // we'll need to adjust this logic. For now, let's update the product fields that exist in the schema.
                    await Product.updateOne(
                        { _id: productId },
                        {
                            product_name: productName,
                            product_category: productCategory,
                            product_type: productType,
                            product_description: productDescription,
                            stock_status: stockStatus
                        }
                    );

                    // Since fields like regular_price, sale_price, etc., belong to product_variants,
                    // we should update the variant instead. Assuming the first variant for simplicity.
                    const variant = await ProductVariant.findOne({ product_id: productId });
                    if (variant) {
                        await ProductVariant.updateOne(
                            { _id: variant._id },
                            {
                                regular_price: parseFloat(regularPrice),
                                sale_price: salePrice ? parseFloat(salePrice) : null,
                                stock_quantity: parseInt(stockQuantity),
                                color: color || null,
                                size: size || null
                            }
                        );
                    }

                    if (req.files && req.files.length > 0) {
                        const images = req.files.map(file => ({
                            product_id: productId,
                            image_path: `/uploads/products/${file.filename}`,
                            is_primary: false
                        }));
                        await ProductImage.insertMany(images);
                        res.json({ success: true, message: 'Product updated successfully' });
                    } else {
                        res.json({ success: true, message: 'Product updated successfully (no new images)' });
                    }
                } catch (err) {
                    res.status(500).json({ success: false, message: 'Failed to update product' });
                }
            });
        })
        .catch(err => {
            res.status(500).json({ success: false, message: 'Database error' });
        });
};

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId).select('vendor_id');
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (product.vendor_id.toString() !== req.session.vendor.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        await ProductImage.deleteMany({ product_id: productId });
        await ProductVariant.deleteMany({ product_id: productId });
        await Product.deleteOne({ _id: productId });

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
};

const deleteProductImage = async (req, res) => {
    try {
        const imageId = req.params.id;
        const image = await ProductImage.findById(imageId).select('product_id');
        if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

        const product = await Product.findById(image.product_id).select('vendor_id');
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        if (product.vendor_id.toString() !== req.session.vendor.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        await ProductImage.deleteOne({ _id: imageId });
        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete image' });
    }
};

const checkout = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    const { cart } = req.body;
    if (!cart || cart.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });

    console.log('Cart data received:', JSON.stringify(cart, null, 2));

    const userId = req.session.user.id;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
        // Validate stock quantity for each item
        for (const item of cart) {
            const variant = await ProductVariant.findOne({ product_id: item.product_id, _id: item.variant_id });
            if (!variant || variant.stock_quantity < item.quantity) {
                throw new Error(`Not enough stock for ${item.product_name} (Size: ${item.size || 'N/A'}, Color: ${item.color || 'N/A'})`);
            }
        }

        // Insert the order
        const order = await Order.create({
            user_id: userId,
            order_date: new Date(),
            status: 'Pending',
            subtotal,
            total_amount: subtotal
        });

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

        // Update stock quantities
        for (const item of cart) {
            await ProductVariant.updateOne(
                { product_id: item.product_id, _id: item.variant_id },
                { $inc: { stock_quantity: -item.quantity } }
            );
        }

        res.json({ success: true, message: 'Order placed successfully', orderId: order._id });
    } catch (err) {
        console.error('Checkout error:', err.message);
        res.status(err.message.includes('Not enough stock') ? 400 : 500).json({ success: false, message: err.message });
    }
};

const getUserOrders = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    try {
        const userId = req.session.user.id;
        const orders = await Order.aggregate([
            { $match: { user_id: mongoose.Types.ObjectId(userId) } },
            {
                $lookup: {
                    from: 'orderitems',
                    localField: '_id',
                    foreignField: 'order_id',
                    as: 'items'
                }
            },
            { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'productimages',
                    localField: 'items.product_id',
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
                $group: {
                    _id: '$_id',
                    order_id: { $first: '$_id' },
                    order_date: { $first: '$order_date' },
                    status: { $first: '$status' },
                    subtotal: { $first: '$subtotal' },
                    total_amount: { $first: '$total_amount' },
                    delivery_date: { $first: '$delivery_date' },
                    items: {
                        $push: {
                            product_id: '$items.product_id',
                            variant_id: '$items.variant_id',
                            product_name: '$items.product_name',
                            quantity: '$items.quantity',
                            price: '$items.price',
                            size: '$items.size',
                            color: '$items.color',
                            image_path: { $ifNull: ['$images.image_path', '/images/default-product.jpg'] }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    order_id: 1,
                    order_date: 1,
                    status: 1,
                    subtotal: 1,
                    total_amount: 1,
                    delivery_date: 1,
                    items: 1
                }
            },
            { $sort: { order_date: -1 } }
        ]);

        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
};

const reorder = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'User not logged in' });

    try {
        const orderId = req.params.orderId;
        const items = await OrderItem.aggregate([
            { $match: { order_id: mongoose.Types.ObjectId(orderId) } },
            {
                $lookup: {
                    from: 'productimages',
                    localField: 'product_id',
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
                    _id: 0,
                    product_id: 1,
                    variant_id: 1,
                    product_name: 1,
                    quantity: 1,
                    price: 1,
                    size: 1,
                    color: 1,
                    image_path: '$images.image_path'
                }
            }
        ]);

        if (items.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });

        res.json({ success: true, cart: items });
    } catch (err) {
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