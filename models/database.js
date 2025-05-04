const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGODB_URI = 'mongodb://localhost:27017/petstore'; // Replace with your MongoDB URI

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Define Schemas
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    profile_pic: { type: String },
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

const eventManagerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contact_number: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    company_name: { type: String, required: true },
    location: { type: String, required: true },
    event_type: { type: String },
    license: { type: String },
    bio: { type: String },
    member_since: { type: String },
    image: { type: String },
    created_at: { type: Date, default: Date.now },
});

const productSchema = new mongoose.Schema({
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    product_name: { type: String, required: true },
    product_category: { type: String, required: true },
    product_type: { type: String, required: true },
    product_description: { type: String, required: true },
    sku: { type: String },
    stock_status: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

const productVariantSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    size: { type: String },
    color: { type: String },
    regular_price: { type: Number, required: true },
    sale_price: { type: Number },
    stock_quantity: { type: Number, required: true },
    sku: { type: String },
});

const productImageSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    image_path: { type: String, required: true },
    is_primary: { type: Boolean, default: false },
});

const orderSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order_date: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' },
    subtotal: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    delivery_date: { type: Date },
});

const orderItemSchema = new mongoose.Schema({
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    size: { type: String },
    color: { type: String },
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
    status: { type: String, default: 'Upcoming' },
    total_tickets: { type: Number, default: 1000 },
    tickets_sold: { type: Number, default: 0 },
    city: { type: String, required: true },
    contact_number: { type: String, required: true },
    image: { type: String },
    created_at: { type: Date, default: Date.now },
});

const eventAttendeeSchema = new mongoose.Schema({
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    phone_number: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    seats: { type: Number, default: 1 },
    with_pet: { type: Boolean, default: false },
    pet_name: { type: String },
    pet_breed: { type: String },
    pet_dob: { type: Date },
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

async function createTables() {
    // MongoDB collections are created automatically when data is inserted
    // Create indexes for better query performance
    await User.createIndexes();
    await Vendor.createIndexes();
    await EventManager.createIndexes();
    await Product.createIndexes();
    await ProductVariant.createIndexes();
    await ProductImage.createIndexes();
    await Order.createIndexes();
    await OrderItem.createIndexes();
    await Event.createIndexes();
    await EventAttendee.createIndexes();
    console.log('MongoDB collections and indexes created');
}

module.exports = {
    db: mongoose.connection,
    createTables,
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