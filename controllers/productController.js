const mongoose = require('mongoose');
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
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
            return cb(new Error('Only image files (jpg, jpeg, png) are allowed'), false);
        }
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

        const formattedProducts = products.map(product => ({
            id: product.id.toString(),
            product_name: product.product_name,
            product_type: product.product_type,
            product_category: product.product_category,
            min_regular_price: product.min_regular_price || 0,
            min_sale_price: product.min_sale_price || null,
            image_path: product.image_path || '/images/default-product.jpg'
        }));

        const filters = {
            productTypes: await Product.distinct('product_type'),
            colors: (await ProductVariant.distinct('color')).filter(color => color != null && color !== ''),
            sizes: (await ProductVariant.distinct('size')).filter(size => size != null && size !== ''),
            maxPrice: (await ProductVariant.find().sort({ regular_price: -1 }).limit(1))[0]?.regular_price || 15000
        };

        res.render('pet_accessory', { 
            user: req.session.user || null, 
            products: formattedProducts, 
            filters,
            productsData: JSON.stringify(formattedProducts)
        });
    } catch (error) {
        console.error('Error fetching pet accessories:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching products' });
    }
};

const submitProduct = (req, res) => {
    uploadProductImages(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: 'Upload error: File size limit exceeded or too many files' });
        }
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            const {
                product_name, product_category, product_type, product_description,
                variant_size, variant_color, variant_regular_price, variant_sale_price, variant_stock_quantity
            } = req.body;

            // Input validation
            if (!product_name || !product_category || !product_type || !product_description) {
                return res.status(400).json({ success: false, message: 'All basic product fields are required' });
            }
            if (product_name.length < 2) {
                return res.status(400).json({ success: false, message: 'Product name must be at least 2 characters' });
            }
            if (product_description.length < 10) {
                return res.status(400).json({ success: false, message: 'Product description must be at least 10 characters' });
            }
            if (!Array.isArray(variant_size) || !variant_size.length) {
                return res.status(400).json({ success: false, message: 'At least one variant with size is required' });
            }

            // Validate vendor_id
            if (!req.session.vendor || !req.session.vendor.id) {
                return res.status(401).json({ success: false, message: 'Unauthorized: Vendor not logged in' });
            }
            const vendorIdString = req.session.vendor.id;
            if (!mongoose.Types.ObjectId.isValid(vendorIdString)) {
                return res.status(400).json({ success: false, message: 'Invalid vendor ID in session' });
            }
            const vendorId = new mongoose.Types.ObjectId(vendorIdString);

            const product = new Product({
                vendor_id: vendorId,
                product_name,
                product_category,
                product_type,
                product_description,
                stock_status: 'In Stock',
                created_at: new Date()
            });
            await product.save();

            const variants = variant_size.map((size, i) => {
                const regularPrice = parseFloat(variant_regular_price[i]);
                const salePrice = variant_sale_price[i] ? parseFloat(variant_sale_price[i]) : null;
                const stockQuantity = parseInt(variant_stock_quantity[i]);

                if (isNaN(regularPrice) || regularPrice <= 0) {
                    throw new Error('Regular price must be a positive number for all variants');
                }
                if (isNaN(stockQuantity) || stockQuantity < 0) {
                    throw new Error('Stock quantity must be a non-negative number for all variants');
                }
                if (salePrice && (isNaN(salePrice) || salePrice <= 0)) {
                    throw new Error('Sale price must be a positive number if provided');
                }
                if (salePrice && salePrice >= regularPrice) {
                    throw new Error('Sale price must be less than regular price for all variants');
                }

                return {
                    product_id: product._id,
                    size: size || null,
                    color: variant_color[i] || null,
                    regular_price: regularPrice,
                    sale_price: salePrice,
                    stock_quantity: stockQuantity
                };
            });

            await ProductVariant.insertMany(variants);

            if (req.files && req.files.length > 0) {
                const images = req.files.map((file, i) => ({
                    product_id: product._id,
                    image_path: `/uploads/products/${file.filename}`,
                    is_primary: i === 0
                }));
                await ProductImage.insertMany(images);
                res.status(201).json({ success: true, message: 'Product added successfully', redirect: '/shop-products' });
            } else {
                res.status(201).json({ success: true, message: 'Product added successfully (no images)', redirect: '/shop-products' });
            }
        } catch (error) {
            console.error('Error adding product:', error);
            res.status(500).json({ success: false, message: 'Server error while adding product' });
        }
    });
};

const getVendorProducts = async (req, res) => {
    try {
        // Validate vendor_id
        if (!req.session.vendor || !req.session.vendor.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Vendor not logged in' });
        }
        const vendorIdString = req.session.vendor.id;
        if (!mongoose.Types.ObjectId.isValid(vendorIdString)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID in session' });
        }
        const vendorId = new mongoose.Types.ObjectId(vendorIdString);

        const products = await Product.aggregate([
            { $match: { vendor_id: vendorId } },
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
                    id: '$_id',
                    product_name: 1,
                    primary_image: { $arrayElemAt: ['$images.image_path', 0] }
                }
            },
            { $sort: { created_at: -1 } }
        ]);

        const formattedProducts = products.map(product => ({
            id: product.id.toString(),
            product_name: product.product_name,
            primary_image: product.primary_image || '/images/default-product.jpg'
        }));

        res.json({ success: true, products: formattedProducts });
    } catch (error) {
        console.error('Error fetching vendor products:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching products' });
    }
};

const getProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }
        const productObjectId = new mongoose.Types.ObjectId(productId);

        const product = await Product.findById(productObjectId)
            .select('product_name product_type product_category product_description');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variants = await ProductVariant.find({ product_id: productObjectId })
            .select('size color regular_price sale_price stock_quantity');
        const images = await ProductImage.find({ product_id: productObjectId })
            .select('image_path is_primary');

        const productData = {
            id: product._id.toString(),
            product_name: product.product_name,
            product_type: product.product_type,
            product_category: product.product_category,
            product_description: product.product_description,
            variants: variants.map(v => ({
                variant_id: v._id.toString(),
                size: v.size,
                color: v.color,
                regular_price: v.regular_price,
                sale_price: v.sale_price,
                stock_quantity: v.stock_quantity
            })),
            images: images.map(img => ({
                image_path: img.image_path,
                is_primary: img.is_primary
            }))
        };

        productData.image_path = productData.images.find(img => img.is_primary)?.image_path || '/images/default-product.jpg';

        res.render('pet_product_details', { 
            product: productData,
            productJSON: JSON.stringify(productData), 
            user: req.session.user || null 
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching product' });
    }
};

const updateProduct = (req, res) => {
    const productId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }
    const productObjectId = new mongoose.Types.ObjectId(productId);

    // Validate vendor_id
    if (!req.session.vendor || !req.session.vendor.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Vendor not logged in' });
    }
    const vendorIdString = req.session.vendor.id;
    if (!mongoose.Types.ObjectId.isValid(vendorIdString)) {
        return res.status(400).json({ success: false, message: 'Invalid vendor ID in session' });
    }
    const vendorId = new mongoose.Types.ObjectId(vendorIdString);

    Product.findById(productObjectId, async (err, product) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Server error while fetching product' });
        }
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        if (product.vendor_id.toString() !== vendorId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not have permission to update this product' });
        }

        uploadProductImages(req, res, async (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ success: false, message: 'Upload error: File size limit exceeded or too many files' });
            }
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }

            try {
                const {
                    'product-name': productName,
                    'product-category': productCategory,
                    'product-type': productType,
                    'product-description': productDescription,
                    'regular-price': regularPrice,
                    'sale-price': salePrice,
                    'stock-quantity': stockQuantity,
                    'stock-status': stockStatus,
                    'color': color,
                    'size': size
                } = req.body;

                // Input validation
                if (!productName || !productCategory || !productType || !productDescription) {
                    return res.status(400).json({ success: false, message: 'All basic product fields are required' });
                }
                if (productName.length < 2) {
                    return res.status(400).json({ success: false, message: 'Product name must be at least 2 characters' });
                }
                if (productDescription.length < 10) {
                    return res.status(400).json({ success: false, message: 'Product description must be at least 10 characters' });
                }
                if (!['In Stock', 'Out of Stock'].includes(stockStatus)) {
                    return res.status(400).json({ success: false, message: 'Invalid stock status' });
                }

                // Update Product fields
                await Product.findByIdAndUpdate(productObjectId, {
                    product_name: productName,
                    product_category: productCategory,
                    product_type: productType,
                    product_description: productDescription,
                    stock_status: stockStatus
                });

                // Validate variant fields
                const regularPriceNum = regularPrice ? parseFloat(regularPrice) : null;
                const salePriceNum = salePrice ? parseFloat(salePrice) : null;
                const stockQuantityNum = stockQuantity ? parseInt(stockQuantity) : null;

                if (regularPriceNum === null || isNaN(regularPriceNum) || regularPriceNum <= 0) {
                    return res.status(400).json({ success: false, message: 'Regular price must be a positive number' });
                }
                if (stockQuantityNum === null || isNaN(stockQuantityNum) || stockQuantityNum < 0) {
                    return res.status(400).json({ success: false, message: 'Stock quantity must be a non-negative number' });
                }
                if (salePriceNum && (isNaN(salePriceNum) || salePriceNum <= 0)) {
                    return res.status(400).json({ success: false, message: 'Sale price must be a positive number if provided' });
                }
                if (salePriceNum && salePriceNum >= regularPriceNum) {
                    return res.status(400).json({ success: false, message: 'Sale price must be less than regular price' });
                }

                // Update or create ProductVariant
                const existingVariant = await ProductVariant.findOne({ product_id: productObjectId });
                if (existingVariant) {
                    await ProductVariant.findOneAndUpdate(
                        { product_id: productObjectId },
                        {
                            regular_price: regularPriceNum,
                            sale_price: salePriceNum,
                            stock_quantity: stockQuantityNum,
                            color: color || existingVariant.color,
                            size: size || existingVariant.size
                        }
                    );
                } else {
                    await ProductVariant.create({
                        product_id: productObjectId,
                        regular_price: regularPriceNum,
                        sale_price: salePriceNum,
                        stock_quantity: stockQuantityNum,
                        color: color || null,
                        size: size || null
                    });
                }

                // Update stock status based on stock quantity
                if (stockQuantityNum === 0 && stockStatus !== 'Out of Stock') {
                    await Product.findByIdAndUpdate(productObjectId, { stock_status: 'Out of Stock' });
                } else if (stockQuantityNum > 0 && stockStatus !== 'In Stock') {
                    await Product.findByIdAndUpdate(productObjectId, { stock_status: 'In Stock' });
                }

                if (req.files && req.files.length > 0) {
                    const images = req.files.map((file, i) => ({
                        product_id: productObjectId,
                        image_path: `/uploads/products/${file.filename}`,
                        is_primary: i === 0
                    }));
                    await ProductImage.insertMany(images);
                    res.json({ success: true, message: 'Product updated successfully', redirect: '/shop-products' });
                } else {
                    res.json({ success: true, message: 'Product updated successfully (no new images)', redirect: '/shop-products' });
                }
            } catch (error) {
                console.error('Error updating product:', error);
                res.status(500).json({ success: false, message: 'Server error while updating product' });
            }
        });
    });
};

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }
        const productObjectId = new mongoose.Types.ObjectId(productId);

        // Validate vendor_id
        if (!req.session.vendor || !req.session.vendor.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Vendor not logged in' });
        }
        const vendorIdString = req.session.vendor.id;
        if (!mongoose.Types.ObjectId.isValid(vendorIdString)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID in session' });
        }
        const vendorId = new mongoose.Types.ObjectId(vendorIdString);

        const product = await Product.findById(productObjectId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        if (product.vendor_id.toString() !== vendorId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not have permission to delete this product' });
        }

        await ProductImage.deleteMany({ product_id: productObjectId });
        await ProductVariant.deleteMany({ product_id: productObjectId });
        await Product.findByIdAndDelete(productObjectId);
        res.json({ success: true, message: 'Product deleted successfully', redirect: '/shop-products' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting product' });
    }
};

const deleteProductImage = async (req, res) => {
    try {
        const imageId = req.params.id;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(imageId)) {
            return res.status(400).json({ success: false, message: 'Invalid image ID' });
        }

        // Validate vendor_id
        if (!req.session.vendor || !req.session.vendor.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Vendor not logged in' });
        }
        const vendorIdString = req.session.vendor.id;
        if (!mongoose.Types.ObjectId.isValid(vendorIdString)) {
            return res.status(400).json({ success: false, message: 'Invalid vendor ID in session' });
        }
        const vendorId = new mongoose.Types.ObjectId(vendorIdString);

        const image = await ProductImage.findById(imageId).populate('product_id');
        if (!image) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }
        if (image.product_id.vendor_id.toString() !== vendorId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You do not have permission to delete this image' });
        }

        await ProductImage.findByIdAndDelete(imageId);

        // If the deleted image was primary, set another image as primary
        const remainingImages = await ProductImage.find({ product_id: image.product_id._id });
        if (image.is_primary && remainingImages.length > 0) {
            await ProductImage.findByIdAndUpdate(remainingImages[0]._id, { is_primary: true });
        }

        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting product image:', error);
        res.status(500).json({ success: false, message: 'Server error while deleting image' });
    }
};

const checkout = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    const { cart } = req.body;
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty or invalid' });
    }

    try {
        // Validate user_id
        const userIdString = req.session.user.id;
        if (!mongoose.Types.ObjectId.isValid(userIdString)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID in session' });
        }
        const userId = new mongoose.Types.ObjectId(userIdString);

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Validate stock quantity for each item
        for (const item of cart) {
            if (!mongoose.Types.ObjectId.isValid(item.product_id) || !mongoose.Types.ObjectId.isValid(item.variant_id)) {
                return res.status(400).json({ success: false, message: `Invalid product or variant ID for ${item.product_name}` });
            }
            const productId = new mongoose.Types.ObjectId(item.product_id);
            const variantId = new mongoose.Types.ObjectId(item.variant_id);

            const variant = await ProductVariant.findOne({ product_id: productId, _id: variantId });
            if (!variant) {
                return res.status(404).json({ success: false, message: `Variant not found for ${item.product_name}` });
            }
            if (variant.stock_quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Not enough stock for ${item.product_name} (Size: ${item.size || 'N/A'}, Color: ${item.color || 'N/A'})`
                });
            }
        }

        // Create the order
        const order = new Order({
            user_id: userId,
            order_date: new Date(),
            status: 'Pending',
            subtotal,
            total_amount: subtotal,
            created_at: new Date()
        });
        await order.save();

        // Create order items
        const orderItems = cart.map(item => ({
            order_id: order._id,
            product_id: new mongoose.Types.ObjectId(item.product_id),
            variant_id: new mongoose.Types.ObjectId(item.variant_id),
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            size: item.size || null,
            color: item.color || null
        }));
        await OrderItem.insertMany(orderItems);

        // Update stock quantities and stock status
        for (const item of cart) {
            const productId = new mongoose.Types.ObjectId(item.product_id);
            const variantId = new mongoose.Types.ObjectId(item.variant_id);

            const updatedVariant = await ProductVariant.findOneAndUpdate(
                { product_id: productId, _id: variantId },
                { $inc: { stock_quantity: -item.quantity } },
                { new: true }
            );

            // Update stock status based on remaining stock
            const productVariants = await ProductVariant.find({ product_id: productId });
            const totalStock = productVariants.reduce((sum, v) => sum + v.stock_quantity, 0);
            const newStockStatus = totalStock > 0 ? 'In Stock' : 'Out of Stock';
            await Product.findByIdAndUpdate(productId, { stock_status: newStockStatus });
        }

        res.json({ success: true, message: 'Order placed successfully', orderId: order._id.toString() });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(error.message.includes('Not enough stock') ? 400 : 500).json({
            success: false,
            message: error.message.includes('Not enough stock') ? error.message : 'Server error during checkout'
        });
    }
};

const getUserOrders = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    try {
        // Validate user_id
        const userIdString = req.session.user.id;
        if (!mongoose.Types.ObjectId.isValid(userIdString)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID in session' });
        }
        const userId = new mongoose.Types.ObjectId(userIdString);

        const orders = await Order.aggregate([
            { $match: { user_id: userId } },
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
            order_id: order._id.toString(),
            order_date: new Date(order.order_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            status: order.status,
            subtotal: order.subtotal.toFixed(2),
            total_amount: order.total_amount.toFixed(2),
            delivery_date: order.delivery_date
                ? new Date(order.delivery_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                  })
                : 'N/A',
            items: order.items.map(item => ({
                product_id: item.product_id.toString(),
                variant_id: item.variant_id.toString(),
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
        console.error('Error fetching user orders:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching orders' });
    }
};

const reorder = async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    try {
        const orderId = req.params.orderId;
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order ID' });
        }
        const orderObjectId = new mongoose.Types.ObjectId(orderId);

        // Validate user_id
        const userIdString = req.session.user.id;
        if (!mongoose.Types.ObjectId.isValid(userIdString)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID in session' });
        }
        const userId = new mongoose.Types.ObjectId(userIdString);

        const order = await Order.findOne({ _id: orderObjectId, user_id: userId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found or you do not have permission to access it' });
        }

        const items = await OrderItem.aggregate([
            { $match: { order_id: orderObjectId } },
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

        if (items.length === 0) {
            return res.status(404).json({ success: false, message: 'No items found for this order' });
        }

        const formattedItems = items.map(item => ({
            product_id: item.product_id.toString(),
            variant_id: item.variant_id.toString(),
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
            color: item.color,
            image_path: item.images[0]?.image_path || '/images/default-product.jpg'
        }));

        res.json({ success: true, cart: formattedItems });
    } catch (error) {
        console.error('Error reordering:', error);
        res.status(500).json({ success: false, message: 'Server error while reordering' });
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