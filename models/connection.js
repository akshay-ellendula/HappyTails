const mongoose = require('mongoose');

// MongoDB connection URI (hardcoded)
const MONGODB_URI = 'mongodb+srv://vedaprakash8341:vedaprakash9491@cluster0.jykgpnw.mongodb.net/happytails';

// Function to connect to MongoDB
async function connectToMongo() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        throw err; // Throw error to be caught in server.js
    }
}

// Define schemas
const userSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    user_name: { type: String, required: true },
    user_email: { type: String, required: true, unique: true },
    user_password: { type: String, required: true },
    user_phone: { type: String },
    user_address: { type: String },
    profile_pic: { type: String },
    created_at: { type: Date, default: Date.now }
});

const vendorSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    contact_number: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    store_name: { type: String, required: true },
    store_location: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    vendor_id: { type: Number, required: true },
    product_name: { type: String, required: true },
    product_category: { type: String, required: true },
    product_type: { type: String, required: true },
    product_description: { type: String, required: true },
    stock_status: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const productVariantSchema = new mongoose.Schema({
    product_id: { type: Number, required: true },
    size: { type: String },
    color: { type: String },
    regular_price: { type: Number, required: true },
    sale_price: { type: Number },
    stock_quantity: { type: Number, required: true }
});

const productImageSchema = new mongoose.Schema({
    product_id: { type: Number, required: true },
    image_path: { type: String, required: true },
    is_primary: { type: Boolean, default: false }
});

const orderSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    user_id: { type: Number, required: true },
    order_date: { type: Date, default: Date.now },
    status: { type: String, required: true },
    total_amount: { type: Number, required: true }
});

const orderItemSchema = new mongoose.Schema({
    order_id: { type: Number, required: true },
    product_id: { type: Number, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
});

const eventManagerSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contact_number: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    event_manager_id: { type: Number, required: true },
    event_name: { type: String, required: true },
    event_category: { type: String, required: true },
    event_date: { type: Date, required: true },
    event_location: { type: String, required: true },
    event_description: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

// Define models
const User = mongoose.model('User', userSchema, 'users');
const Vendor = mongoose.model('Vendor', vendorSchema, 'vendors');
const Product = mongoose.model('Product', productSchema, 'products');
const ProductVariant = mongoose.model('ProductVariant', productVariantSchema, 'productvariants');
const ProductImage = mongoose.model('ProductImage', productImageSchema, 'productimages');
const Order = mongoose.model('Order', orderSchema, 'orders');
const OrderItem = mongoose.model('OrderItem', orderItemSchema, 'orderitems');
const EventManager = mongoose.model('EventManager', eventManagerSchema, 'eventmanagers');
const Event = mongoose.model('Event', eventSchema, 'events');

// Export the connection function and models
module.exports = {
    connectToMongo,
    User,
    Vendor,
    Product,
    ProductVariant,
    ProductImage,
    Order,
    OrderItem,
    EventManager,
    Event
};