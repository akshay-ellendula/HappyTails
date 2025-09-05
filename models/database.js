const mongoose = require('mongoose');

// Connect to MongoDB Cluster
async function connectToMongoDB() {
    try {
        await mongoose.connect('mongodb+srv://vedaprakash8341:bmfk3zoZflpB8k9L@cluster0.jykgpnw.mongodb.net/happytails', {});
        console.log('Connected to MongoDB Cluster');
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
}

// Define Schemas
const userSchema = new mongoose.Schema({
    user_name: { type: String, required: true },
    user_email: { type: String, required: true, unique: true },
    user_password: { type: String, required: true },
    user_phone: { type: String, default: null },
    user_address: { type: String, default: null },
    profile_pic: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
});

const vendorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact_number: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    store_name: { type: String, required: true },
    store_location: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

// Sanitize store_name before saving
vendorSchema.pre('save', function(next) {
    if (this.store_name) {
        this.store_name = this.store_name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    }
    next();
});

const eventManagerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact_number: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    company_name: { type: String, required: true },
    location: { type: String, required: true },
    event_type: { type: String, default: null },
    license: { type: String, default: null },
    bio: { type: String, default: null },
    member_since: { type: String, default: null },
    image: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    product_name: { type: String, required: true },
    product_category: { type: String, required: true },
    product_type: { type: String, required: true },
    product_description: { type: String, required: true },
    sku: { type: String, default: null },
    stock_status: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

const productVariantSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    size: { type: String, default: null },
    color: { type: String, default: null },
    regular_price: { type: Number, required: true },
    sale_price: { type: Number, default: null },
    stock_quantity: { type: Number, required: true },
    sku: { type: String, default: null },
});

const productImageSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    image_path: { type: String, required: true },
    is_primary: { type: Boolean, default: false },
});

const orderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order_date: { type: Date, default: Date.now },
    status: { type: String, required: true, default: 'Pending' },
    subtotal: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    delivery_date: { type: Date, default: null },
});

const orderItemSchema = new mongoose.Schema({
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    size: { type: String, default: null },
    color: { type: String, default: null },
});

const eventSchema = new mongoose.Schema({
    event_manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'EventManager', required: true },
    event_name: { type: String, required: true },
    about_event: { type: String, required: true },
    language: { type: String, required: true },
    duration: { type: String, required: true },
    ticket_price: { type: Number, required: true },
    age_limit: { type: Number, required: true },
    instructions: { type: String, required: true },
    venue: { type: String, required: true },
    terms: { type: String, required: true },
    category: { type: String, required: true },
    date_time: { type: Date, required: true },
    status: { type: String, required: true, default: 'Upcoming' },
    total_tickets: { type: Number, required: true, default: 1000 },
    tickets_sold: { type: Number, required: true, default: 0 },
    city: { type: String, required: true },
    contact_number: { type: String, required: true },
    image: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
});

const eventAttendeeSchema = new mongoose.Schema({
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true },
    phone_number: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    seats: { type: Number, required: true, default: 1 },
    with_pet: { type: Boolean, required: true, default: false },
    pet_name: { type: String, default: null },
    pet_breed: { type: String, default: null },
    pet_dob: { type: Date, default: null },
    registration_date: { type: Date, default: Date.now },
});

// Create Models
const User = mongoose.model('User', userSchema);
const Vendor = mongoose.model('Vendor', vendorSchema);
const EventManager = mongoose.model('EventManager', eventManagerSchema);
const Product = mongoose.model('Product', productSchema);
const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);
const ProductImage = mongoose.model('ProductImage', productImageSchema);
const Order = mongoose.model('Order', orderSchema);
const OrderItem = mongoose.model('OrderItem', orderItemSchema);
const Event = mongoose.model('Event', eventSchema);
const EventAttendee = mongoose.model('EventAttendee', eventAttendeeSchema);

// Initialize Database (Ensure Connection and Models are Ready)
async function initializeDatabase(callback) {
    await connectToMongoDB();
    callback();
}

module.exports = {
    initializeDatabase,
    User,
    Vendor,
    EventManager,
    Product,
    ProductVariant,
    ProductImage,
    Order,
    OrderItem,
    Event,
    EventAttendee,
};