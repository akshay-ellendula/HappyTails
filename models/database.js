const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// MongoDB connection URI
const uri = 'mongodb+srv://vedaprakash8341:vedaprakash9491@cluster0.jykgpnw.mongodb.net/happytails';

// Define schemas
const UserSchema = new Schema({
  user_name: {
    type: String,
    required: true
  },
  user_email: {
    type: String,
    required: true,
    unique: true
  },
  user_password: {
    type: String,
    required: true
  },
  user_phone: {
    type: String,
    default: null
  },
  user_address: {
    type: String,
    default: null
  },
  profile_pic: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const VendorSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  contact_number: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  store_name: {
    type: String,
    required: true
  },
  store_location: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const EventManagerSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  contact_number: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  company_name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  event_type: {
    type: String,
    default: null
  },
  license: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    default: null
  },
  member_since: {
    type: String,
    default: null
  },
  image: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const ProductSchema = new Schema({
  vendor_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Vendor'
  },
  product_name: {
    type: String,
    required: true
  },
  product_category: {
    type: String,
    required: true
  },
  product_type: {
    type: String,
    required: true
  },
  product_description: {
    type: String,
    required: true
  },
  sku: {
    type: String
  },
  stock_status: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const ProductVariantSchema = new Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
  },
  size: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: null
  },
  regular_price: {
    type: Number,
    required: true
  },
  sale_price: {
    type: Number,
    default: null
  },
  stock_quantity: {
    type: Number,
    required: true
  },
  sku: {
    type: String
  }
});

const ProductImageSchema = new Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
  },
  image_path: {
    type: String,
    required: true
  },
  is_primary: {
    type: Boolean,
    default: false
  }
});

const OrderSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  order_date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    default: 'Pending'
  },
  subtotal: {
    type: Number,
    required: true
  },
  total_amount: {
    type: Number,
    required: true
  },
  delivery_date: {
    type: Date,
    default: null
  }
});

const OrderItemSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Order'
  },
  product_id: {
    type: Schema.Types.ObjectId,
    default: null,
    ref: 'Product'
  },
  variant_id: {
    type: Schema.Types.ObjectId,
    default: null,
    ref: 'ProductVariant'
  },
  product_name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  size: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: null
  }
});

const EventSchema = new Schema({
  event_manager_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'EventManager'
  },
  event_name: {
    type: String,
    required: true
  },
  about_event: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  ticket_price: {
    type: Number,
    required: true
  },
  age_limit: {
    type: Number,
    required: true
  },
  instructions: {
    type: String,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  terms: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  date_time: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    default: 'Upcoming'
  },
  total_tickets: {
    type: Number,
    default: 1000
  },
  tickets_sold: {
    type: Number,
    default: 0
  },
  city: {
    type: String,
    required: true
  },
  contact_number: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const EventAttendeeSchema = new Schema({
  event_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Event'
  },
  user_id: {
    type: Schema.Types.ObjectId,
    default: null,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  phone_number: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  seats: {
    type: Number,
    default: 1
  },
  with_pet: {
    type: Boolean,
    default: false
  },
  pet_name: {
    type: String,
    default: null
  },
  pet_breed: {
    type: String,
    default: null
  },
  pet_dob: {
    type: Date,
    default: null
  },
  registration_date: {
    type: Date,
    default: Date.now
  }
});

// Create models
const User = mongoose.model('User', UserSchema);
const Vendor = mongoose.model('Vendor', VendorSchema);
const EventManager = mongoose.model('EventManager', EventManagerSchema);
const Product = mongoose.model('Product', ProductSchema);
const ProductVariant = mongoose.model('ProductVariant', ProductVariantSchema);
const ProductImage = mongoose.model('ProductImage', ProductImageSchema);
const Order = mongoose.model('Order', OrderSchema);
const OrderItem = mongoose.model('OrderItem', OrderItemSchema);
const Event = mongoose.model('Event', EventSchema);
const EventAttendee = mongoose.model('EventAttendee', EventAttendeeSchema);

// Connect to MongoDB and clear the database
async function connectToMongo(callback) {
    try {
        await mongoose.connect(uri);
        console.log('Successfully connected to MongoDB');
        if (callback) callback();
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
}

module.exports = {
    connectToMongo,
    User,
    Vendor,
    EventManager,
    Product,
    ProductVariant,
    ProductImage,
    Order,
    OrderItem,
    Event,
    EventAttendee
};