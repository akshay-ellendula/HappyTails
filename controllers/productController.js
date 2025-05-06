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

const submitProduct = [
    uploadProductImages,
    async (req, res) => {
        if (!req.session.vendor) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        try {
            const {
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status,
                variants // Expect variants as an object with numeric keys
            } = req.body;

            // Validate required fields
            if (!product_name || !product_category || !product_type || !product_description || !stock_status) {
                return res.status(400).json({ success: false, message: 'All basic information fields are required' });
            }

            if (!variants || Object.keys(variants).length === 0) {
                return res.status(400).json({ success: false, message: 'At least one variant is required' });
            }

            if (!['In Stock', 'Out of Stock'].includes(stock_status)) {
                return res.status(400).json({ success: false, message: 'Invalid stock status' });
            }

            // Parse variants into an array
            const variantArray = Object.keys(variants).map(index => ({
                size: variants[index].size ? variants[index].size.trim() : null,
                color: variants[index].color ? variants[index].color.trim() : null,
                regular_price: parseFloat(variants[index].regular_price),
                sale_price: variants[index].sale_price ? parseFloat(variants[index].sale_price) : null,
                stock_quantity: parseInt(variants[index].stock_quantity)
            }));

            // Validate variants
            for (const variant of variantArray) {
                if (!variant.size || isNaN(variant.regular_price) || isNaN(variant.stock_quantity)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Size, regular price, and stock quantity are required for all variants'
                    });
                }
                if (variant.regular_price <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Regular price must be a positive number'
                    });
                }
                if (variant.stock_quantity < 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Stock quantity must be a non-negative number'
                    });
                }
                if (variant.sale_price && variant.sale_price >= variant.regular_price) {
                    return res.status(400).json({
                        success: false,
                        message: 'Sale price must be less than regular price'
                    });
                }
            }

            // Create the product
            const product = await Product.create({
                vendor_id: req.session.vendor.id,
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status
            });

            // Insert variants
            const variantDocs = variantArray.map(variant => ({
                product_id: product._id,
                size: variant.size,
                color: variant.color,
                regular_price: variant.regular_price,
                sale_price: variant.sale_price,
                stock_quantity: variant.stock_quantity
            }));
            await ProductVariant.insertMany(variantDocs);

            // Insert images
            if (req.files && req.files.length > 0) {
                const images = req.files.map((file, index) => ({
                    product_id: product._id,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: index === 0
                }));
                await ProductImage.insertMany(images);
            }

            res.status(200).json({
                success: true,
                message: 'Product added successfully',
                redirect: '/shop-products'
            });
        } catch (err) {
            console.error('Error adding product:', err);
            res.status(500).json({ success: false, message: `Server error: ${err.message}` });
        }
    }
];

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
                    image_path: imageDoc?.image_path || '/images/default-product.jpg'
                };
            }));

            return {
                ...order,
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