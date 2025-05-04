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
    type: Number,
    required: true
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
    type: Number,
    required: true
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
    type: Number,
    required: true
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
    type: Number,
    required: true
  },
  product_id: {
    type: Number,
    default: null
  },
  variant_id: {
    type: Number,
    default: null
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
    type: Number,
    required: true
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
    type: Number,
    required: true
  },
  user_id: {
    type: Number,
    default: null
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

// Function to insert sample user data
const insertSampleUsers = async () => {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      console.log('Sample users already exist');
      return;
    }

    const sampleUsers = [
      {
        user_name: 'Gautam Thota',
        user_email: 'gautam.thota@example.com',
        user_password: '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W'
      },
      {
        user_name: 'Veda Prakash',
        user_email: 'veda.prakash@example.com',
        user_password: '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W'
      },
      {
        user_name: 'Akshay',
        user_email: 'akshay@example.com',
        user_password: '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W'
      }
    ];

    await User.insertMany(sampleUsers);
    console.log('Sample users inserted successfully');
  } catch (error) {
    console.error('Error inserting sample users:', error.message);
  }
};

// Function to insert sample vendor data
const insertSampleVendors = async () => {
  try {
    const count = await Vendor.countDocuments();
    if (count > 0) {
      console.log('Sample vendors already exist');
      return;
    }

    const sampleVendors = [
      {
        name: 'Gautam Thota',
        contact_number: '9876543210',
        email: 'gautam.thota.vendor@example.com',
        password: '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W',
        store_name: 'Pet Haven',
        store_location: 'Vijayawada'
      },
      {
        name: 'Veda Prakash',
        contact_number: '8765432109',
        email: 'veda.prakash.vendor@example.com',
        password: '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W',
        store_name: 'Furry Friends',
        store_location: 'Hyderabad'
      },
      {
        name: 'Akshay',
        contact_number: '7654321098',
        email: 'akshay.vendor@example.com',
        password: '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W',
        store_name: 'Paws & Claws',
        store_location: 'Bangalore'
      }
    ];

    await Vendor.insertMany(sampleVendors);
    console.log('Sample vendors inserted successfully');
  } catch (error) {
    console.error('Error inserting sample vendors:', error.message);
  }
};

// Function to insert sample event manager data
const insertSampleEventManagers = async () => {
  try {
    const count = await EventManager.countDocuments();
    if (count > 0) {
      console.log('Sample event managers already exist');
      return;
    }

    const sampleEventManagers = [
      {
        name: 'Jeevankumar',
        contact_number: '5551234567',
        email: 'jeevan.kumar@happytails.com',
        password: '$2a$10$pgfWUFy0onfpdOn0dWtWW.7ORHjTouxrwqNcnvNfolhHf9ehFEF4W',
        company_name: 'Happy Events',
        location: 'Hyderabad'
      }
    ];

    await EventManager.insertMany(sampleEventManagers);
    console.log('Sample event managers inserted successfully');
  } catch (error) {
    console.error('Error inserting sample event managers:', error.message);
  }
};

// Function to insert sample product data
const insertSampleProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) {
      console.log('Sample products already exist');
      return;
    }

    const sampleProducts = [
      {
        vendor_id: 1,
        product_name: 'Cozy Pet Bed',
        product_category: 'beds',
        product_type: 'Pet Beds',
        product_description: 'A soft and cozy bed perfect for pets to relax in.',
        sku: 'PB001',
        stock_status: 'In Stock'
      },
      {
        vendor_id: 1,
        product_name: 'Chicken-Flavored Dog Food',
        product_category: 'food',
        product_type: 'Dry',
        product_description: 'Nutritious dry food for dogs with a chicken flavor.',
        sku: 'DF001',
        stock_status: 'In Stock'
      },
      {
        vendor_id: 2,
        product_name: 'Cat Scratching Post',
        product_category: 'toys',
        product_type: 'Furniture',
        product_description: 'Durable scratching post to keep cats entertained.',
        sku: 'SP001',
        stock_status: 'In Stock'
      },
      {
        vendor_id: 2,
        product_name: 'Fish-Flavored Treats',
        product_category: 'food',
        product_type: 'Treats',
        product_description: 'Delicious fish-flavored treats for cats.',
        sku: 'FT001',
        stock_status: 'In Stock'
      },
      {
        vendor_id: 3,
        product_name: 'Grooming Brush',
        product_category: 'grooming',
        product_type: 'Grooming Supplies',
        product_description: 'Gentle brush for keeping pet fur smooth.',
        sku: 'GB001',
        stock_status: 'In Stock'
      },
      {
        vendor_id: 3,
        product_name: 'Pet Carrier',
        product_category: 'beds',
        product_type: 'Carrier',
        product_description: 'Portable carrier for small pets.',
        sku: 'PC001',
        stock_status: 'In Stock'
      },
      {
        vendor_id: 1,
        product_name: 'Interactive Dog Ball',
        product_category: 'toys',
        product_type: 'Toys',
        product_description: 'A durable ball that lights up for interactive play.',
        sku: 'DB001',
        stock_status: 'In Stock'
      },
      {
        vendor_id: 2,
        product_name: 'Luxury Cat Bed',
        product_category: 'beds',
        product_type: 'Pet Beds',
        product_description: 'A plush bed with extra cushioning for cats.',
        sku: 'CB001',
        stock_status: 'In Stock'
      }
    ];

    await Product.insertMany(sampleProducts);
    console.log('Sample products inserted successfully');
  } catch (error) {
    console.error('Error inserting sample products:', error.message);
  }
};

// Function to insert sample product variant data
const insertSampleProductVariants = async () => {
  try {
    const count = await ProductVariant.countDocuments();
    if (count > 0) {
      console.log('Sample product variants already exist');
      return;
    }

    const sampleProductVariants = [
      {
        product_id: 1,
        size: 'Small',
        color: 'Brown',
        regular_price: 1999.99,
        sale_price: 1799.99,
        stock_quantity: 10,
        sku: 'PB001-SM-BRN'
      },
      {
        product_id: 1,
        size: 'Medium',
        color: 'Brown',
        regular_price: 2999.99,
        sale_price: 2499.99,
        stock_quantity: 20,
        sku: 'PB001-MD-BRN'
      },
      {
        product_id: 1,
        size: 'Large',
        color: 'Brown',
        regular_price: 3999.99,
        sale_price: 3499.99,
        stock_quantity: 15,
        sku: 'PB001-LG-BRN'
      },
      {
        product_id: 1,
        size: 'Medium',
        color: 'Grey',
        regular_price: 2999.99,
        sale_price: 2599.99,
        stock_quantity: 8,
        sku: 'PB001-MD-GRY'
      },
      {
        product_id: 2,
        size: '1kg',
        color: null,
        regular_price: 499.99,
        sale_price: null,
        stock_quantity: 30,
        sku: 'DF001-1KG'
      },
      {
        product_id: 2,
        size: '5kg',
        color: null,
        regular_price: 1499.99,
        sale_price: null,
        stock_quantity: 50,
        sku: 'DF001-5KG'
      },
      {
        product_id: 3,
        size: 'Small',
        color: 'Grey',
        regular_price: 999.99,
        sale_price: 899.99,
        stock_quantity: 25,
        sku: 'SP001-SM-GRY'
      },
      {
        product_id: 3,
        size: 'Large',
        color: 'Grey',
        regular_price: 1999.99,
        sale_price: 1799.99,
        stock_quantity: 15,
        sku: 'SP001-LG-GRY'
      },
      {
        product_id: 4,
        size: '100g',
        color: null,
        regular_price: 199.99,
        sale_price: null,
        stock_quantity: 100,
        sku: 'FT001-100G'
      },
      {
        product_id: 4,
        size: '250g',
        color: null,
        regular_price: 499.99,
        sale_price: null,
        stock_quantity: 75,
        sku: 'FT001-250G'
      },
      {
        product_id: 5,
        size: null,
        color: 'Blue',
        regular_price: 799.99,
        sale_price: 699.99,
        stock_quantity: 30,
        sku: 'GB001-BLU'
      },
      {
        product_id: 5,
        size: null,
        color: 'Red',
        regular_price: 799.99,
        sale_price: 699.99,
        stock_quantity: 20,
        sku: 'GB001-RED'
      },
      {
        product_id: 6,
        size: 'Small',
        color: 'Grey',
        regular_price: 2999.99,
        sale_price: 2799.99,
        stock_quantity: 12,
        sku: 'PC001-SM-GRY'
      },
      {
        product_id: 6,
        size: 'Medium',
        color: 'Grey',
        regular_price: 3999.99,
        sale_price: 3499.99,
        stock_quantity: 10,
        sku: 'PC001-MD-GRY'
      },
      {
        product_id: 7,
        size: 'Small',
        color: 'Green',
        regular_price: 599.99,
        sale_price: 549.99,
        stock_quantity: 40,
        sku: 'DB001-SM-GRN'
      },
      {
        product_id: 7,
        size: 'Medium',
        color: 'Green',
        regular_price: 799.99,
        sale_price: 699.99,
        stock_quantity: 30,
        sku: 'DB001-MD-GRN'
      },
      {
        product_id: 8,
        size: 'Small',
        color: 'Purple',
        regular_price: 2499.99,
        sale_price: 2299.99,
        stock_quantity: 15,
        sku: 'CB001-SM-PUR'
      },
      {
        product_id: 8,
        size: 'Large',
        color: 'Purple',
        regular_price: 3499.99,
        sale_price: 3199.99,
        stock_quantity: 10,
        sku: 'CB001-LG-PUR'
      },
      {
        product_id: 8,
        size: 'Large',
        color: 'White',
        regular_price: 3499.99,
        sale_price: 3199.99,
        stock_quantity: 8,
        sku: 'CB001-LG-WHT'
      }
    ];

    await ProductVariant.insertMany(sampleProductVariants);
    console.log('Sample product variants inserted successfully');
  } catch (error) {
    console.error('Error inserting sample product variants:', error.message);
  }
};

// Function to insert sample product image data
const insertSampleProductImages = async () => {
  try {
    const count = await ProductImage.countDocuments();
    if (count > 0) {
      console.log('Sample product images already exist');
      return;
    }

    const sampleProductImages = [
      {
        product_id: 1,
        image_path: '/images/cat in cat cave, to advertise the cat cave with a plane grey background, a little bigger.jpg',
        is_primary: true
      },
      {
        product_id: 1,
        image_path: '/images/cat in cat cave, to advertise the cat cave with a plane grey background, a little bigger.jpg',
        is_primary: false
      },
      {
        product_id: 2,
        image_path: 'https://m.media-amazon.com/images/I/71bQdtBbRdL._SX679_.jpg',
        is_primary: true
      },
      {
        product_id: 3,
        image_path: 'https://outdocart.s3.amazonaws.com/uploads/petamore/productImages/full/16674284952277The-Grey.jpg',
        is_primary: true
      },
      {
        product_id: 4,
        image_path: 'https://m.media-amazon.com/images/I/71bQdtBbRdL._SX679_.jpg',
        is_primary: true
      },
      {
        product_id: 5,
        image_path: 'https://m.media-amazon.com/images/I/31aUaDQjrML._SY300_SX300_QL70_FMwebp_.jpg',
        is_primary: true
      },
      {
        product_id: 5,
        image_path: 'https://m.media-amazon.com/images/I/812do46q6rL._SY450_.jpg',
        is_primary: false
      },
      {
        product_id: 6,
        image_path: 'https://animeal.in/cdn/shop/files/I04885_1.webp?v=1705649283&width=493',
        is_primary: true
      },
      {
        product_id: 7,
        image_path: 'https://qpets.in/cdn/shop/files/61V2I5Y6RkL_1800x1800.jpg?v=1732756268',
        is_primary: true
      },
      {
        product_id: 8,
        image_path: 'https://headsupfortails.com/cdn/shop/products/HUFT-Personalised-Cosy-Puppy-Cat-Bed---Lilac.jpg?v=1739045338&width=823',
        is_primary: true
      },
      {
        product_id: 8,
        image_path: '/images/luxury_cat_bed_white.jpg',
        is_primary: false
      }
    ];

    await ProductImage.insertMany(sampleProductImages);
    console.log('Sample product images inserted successfully');
  } catch (error) {
    console.error('Error inserting sample product images:', error.message);
  }
};

// Function to insert sample order data
const insertSampleOrders = async () => {
  try {
    const count = await Order.countDocuments();
    if (count > 0) {
      console.log('Sample orders already exist');
      return;
    }

    const sampleOrders = [
      {
        user_id: 1,
        order_date: new Date('2025-03-01T10:00:00Z'),
        status: 'Delivered',
        subtotal: 1799.99,
        total_amount: 1799.99,
        delivery_date: new Date('2025-03-05T14:00:00Z')
      },
      {
        user_id: 1,
        order_date: new Date('2025-03-10T12:00:00Z'),
        status: 'Pending',
        subtotal: 549.99,
        total_amount: 549.99
      },
      {
        user_id: 2,
        order_date: new Date('2025-03-15T09:00:00Z'),
        status: 'Delivered',
        subtotal: 899.99,
        total_amount: 899.99,
        delivery_date: new Date('2025-03-20T14:00:00Z')
      },
      {
        user_id: 2,
        order_date: new Date('2025-03-18T11:00:00Z'),
        status: 'Pending',
        subtotal: 199.99,
        total_amount: 199.99
      },
      {
        user_id: 3,
        order_date: new Date('2025-03-20T15:00:00Z'),
        status: 'Delivered',
        subtotal: 2299.99,
        total_amount: 2299.99,
        delivery_date: new Date('2025-03-25T10:00:00Z')
      }
    ];

    await Order.insertMany(sampleOrders);
    console.log('Sample orders inserted successfully');
  } catch (error) {
    console.error('Error inserting sample orders:', error.message);
  }
};

// Function to insert sample order item data
const insertSampleOrderItems = async () => {
  try {
    const count = await OrderItem.countDocuments();
    if (count > 0) {
      console.log('Sample order items already exist');
      return;
    }

    const sampleOrderItems = [
      {
        order_id: 1,
        product_id: 1,
        variant_id: 1,
        product_name: 'Cozy Pet Bed',
        quantity: 1,
        price: 1799.99,
        size: 'Small',
        color: 'Brown'
      },
      {
        order_id: 2,
        product_id: 7,
        variant_id: 15,
        product_name: 'Interactive Dog Ball',
        quantity: 1,
        price: 549.99,
        size: 'Small',
        color: 'Green'
      },
      {
        order_id: 3,
        product_id: 3,
        variant_id: 7,
        product_name: 'Cat Scratching Post',
        quantity: 1,
        price: 899.99,
        size: 'Small',
        color: 'Grey'
      },
      {
        order_id: 4,
        product_id: 4,
        variant_id: 9,
        product_name: 'Fish-Flavored Treats',
        quantity: 1,
        price: 199.99,
        size: '100g',
        color: null
      },
      {
        order_id: 5,
        product_id: 8,
        variant_id: 17,
        product_name: 'Luxury Cat Bed',
        quantity: 1,
        price: 2299.99,
        size: 'Small',
        color: 'Purple'
      }
    ];

    await OrderItem.insertMany(sampleOrderItems);
    console.log('Sample order items inserted successfully');
  } catch (error) {
    console.error('Error inserting sample order items:', error.message);
  }
};

// Function to insert sample event data
const insertSampleEvents = async () => {
  try {
    const count = await Event.countDocuments();
    if (count > 0) {
      console.log('Sample events already exist');
      return;
    }

    const sampleEvents = [
      {
        event_manager_id: 1,
        event_name: 'Pet Adoption Drive',
        about_event: 'A drive to find homes for shelter pets.',
        language: 'English',
        duration: '3h',
        ticket_price: 0.00,
        age_limit: 0,
        instructions: 'Bring ID proof.',
        venue: 'Shelter Grounds, Bangalore',
        terms: 'Free entry.',
        category: 'Pets',
        date_time: new Date('2025-03-15T10:00:00Z'),
        status: 'Past',
        total_tickets: 500,
        tickets_sold: 450,
        city: 'Bangalore',
        contact_number: '1234567890',
        image: 'https://thumbs.dreamstime.com/z/adorable-kittens-play-yarn-sunlit-living-room-perfect-pet-adoption-promotion-lively-frolic-colorful-pastel-rug-341932672.jpg?ct=jpeg'
      },
      {
        event_manager_id: 1,
        event_name: 'Fancy Dress Show',
        about_event: 'A fun fancy dress show for pets.',
        language: 'English',
        duration: '2h',
        ticket_price: 5.00,
        age_limit: 0,
        instructions: 'Bring your pet in a costume.',
        venue: 'Central Park, Delhi',
        terms: 'No refunds.',
        category: 'Pets',
        date_time: new Date('2025-03-27T17:00:00Z'),
        status: 'Ongoing',
        total_tickets: 1000,
        tickets_sold: 900,
        city: 'Delhi',
        contact_number: '1234567890',
        image: 'https://thumbs.dreamstime.com/b/small-dog-wearing-blue-gold-dress-generative-ai-small-dog-wearing-blue-gold-dress-ai-generated-328996362.jpg'
      },
      {
        event_manager_id: 1,
        event_name: 'Dog Run',
        about_event: 'A running competition for dogs.',
        language: 'English',
        duration: '1h',
        ticket_price: 5.00,
        age_limit: 0,
        instructions: 'Ensure your dog is healthy.',
        venue: 'Sports Ground, Delhi',
        terms: 'No refunds.',
        category: 'Pets',
        date_time: new Date('2025-03-27T10:00:00Z'),
        status: 'Ongoing',
        total_tickets: 1000,
        tickets_sold: 100,
        city: 'Delhi',
        contact_number: '1234567890',
        image: 'https://thumbs.dreamstime.com/z/dog-running-grass-smile-his-face-ai-328994856.jpg?ct=jpeg'
      },
      {
        event_manager_id: 1,
        event_name: 'Dog Agility Competitions',
        about_event: 'A competition for dog agility.',
        language: 'English',
        duration: '2h',
        ticket_price: 5.00,
        age_limit: 0,
        instructions: 'Bring your dog.',
        venue: 'Park, Hyderabad',
        terms: 'No refunds.',
        category: 'Pets',
        date_time: new Date('2025-04-01T09:30:00Z'),
        status: 'Upcoming',
        total_tickets: 1000,
        tickets_sold: 850,
        city: 'Hyderabad',
        contact_number: '1234567890',
        image: 'https://thumbs.dreamstime.com/z/dog-jumping-agility-poles-golden-retriever-jumps-over-set-mid-air-white-red-stripes-out-focus-344721458.jpg?ct=jpeg'
      },
      {
        event_manager_id: 1,
        event_name: 'Pet Festival',
        about_event: 'A festival for pet lovers.',
        language: 'English',
        duration: '3h',
        ticket_price: 10.00,
        age_limit: 0,
        instructions: 'Bring your pet.',
        venue: 'Mumbai Park',
        terms: 'No refunds.',
        category: 'Pets',
        date_time: new Date('2025-04-05T11:00:00Z'),
        status: 'Upcoming',
        total_tickets: 1500,
        tickets_sold: 740,
        city: 'Mumbai',
        contact_number: '1234567890',
        image: 'https://thumbs.dreamstime.com/z/joyful-dog-running-amidst-vibrant-colors-indian-holi-festival-concept-cultural-celebration-pet-happiness-ai-generated-joyful-354114015.jpg?ct=jpeg'
      },
      {
        event_manager_id: 1,
        event_name: 'Cat Show',
        about_event: 'A showcase of feline beauty.',
        language: 'English',
        duration: '2h',
        ticket_price: 8.00,
        age_limit: 0,
        instructions: 'Bring your cat.',
        venue: 'Convention Center, Chennai',
        terms: 'No refunds.',
        category: 'Pets',
        date_time: new Date('2025-04-10T14:00:00Z'),
        status: 'Upcoming',
        total_tickets: 800,
        tickets_sold: 300,
        city: 'Chennai',
        contact_number: '1234567890',
        image: 'https://thumbs.dreamstime.com/z/stylish-cat-draped-pearls-stands-gracefully-theater-surrounded-rich-red-curtains-embodying-sophistication-charm-354845853.jpg?ct=jpeg'
      }
    ];

    await Event.insertMany(sampleEvents);
    console.log('Sample events inserted successfully');
  } catch (error) {
    console.error('Error inserting sample events:', error.message);
  }
};

// Function to insert sample event attendee data
const insertSampleEventAttendees = async () => {
  try {
    const count = await EventAttendee.countDocuments();
    if (count > 0) {
      console.log('Sample event attendees already exist');
      return;
    }

    const sampleEventAttendees = [
      {
        event_id: 1,
        user_id: 1,
        name: 'Christopher Blake',
        phone_number: '946776866876',
        email: 'christopher.blake@example.com',
        address: '123 Main St, Bangalore',
        seats: 5,
        with_pet: true,
        pet_name: 'Max',
        pet_breed: 'Golden Retriever',
        pet_dob: new Date('2020-05-15'),
        registration_date: new Date('2025-02-20T10:00:00Z')
      },
      {
        event_id: 1,
        user_id: null,
        name: 'Sarah Lee',
        phone_number: '9876543210',
        email: 'sarah.lee@example.com',
        address: '456 Elm St, Bangalore',
        seats: 2,
        with_pet: false,
        pet_name: null,
        pet_breed: null,
        pet_dob: null,
        registration_date: new Date('2025-02-25T14:30:00Z')
      },
      {
        event_id: 2,
        user_id: null,
        name: 'Peter Roy',
        phone_number: '943787457878',
        email: 'peter.roy@example.com',
        address: '456 Park Ave, Delhi',
        seats: 1,
        with_pet: false,
        pet_name: null,
        pet_breed: null,
        pet_dob: null,
        registration_date: new Date('2025-02-15T09:30:00Z')
      },
      {
        event_id: 2,
        user_id: 2,
        name: 'Emily Davis',
        phone_number: '9123456789',
        email: 'emily.davis@example.com',
        address: '789 Oak Rd, Delhi',
        seats: 3,
        with_pet: true,
        pet_name: 'Bella',
        pet_breed: 'Beagle',
        pet_dob: new Date('2021-03-10'),
        registration_date: new Date('2025-03-01T12:00:00Z')
      },
      {
        event_id: 3,
        user_id: 3,
        name: 'Michael Chen',
        phone_number: '9234567890',
        email: 'michael.chen@example.com',
        address: '321 Pine St, Delhi',
        seats: 1,
        with_pet: true,
        pet_name: 'Rocky',
        pet_breed: 'Husky',
        pet_dob: new Date('2019-11-05'),
        registration_date: new Date('2025-03-10T08:45:00Z')
      },
      {
        event_id: 4,
        user_id: 2,
        name: 'Jake Paul',
        phone_number: '941779828690',
        email: 'jake.paul@example.com',
        address: '789 Oak St, Hyderabad',
        seats: 3,
        with_pet: true,
        pet_name: 'Luna',
        pet_breed: 'Labrador',
        pet_dob: new Date('2019-08-10'),
        registration_date: new Date('2025-03-01T08:00:00Z')
      },
      {
        event_id: 4,
        user_id: null,
        name: 'Lisa Kumar',
        phone_number: '9345678901',
        email: 'lisa.kumar@example.com',
        address: '654 Cedar Ave, Hyderabad',
        seats: 2,
        with_pet: true,
        pet_name: 'Buddy',
        pet_breed: 'Poodle',
        pet_dob: new Date('2020-12-15'),
        registration_date: new Date('2025-03-20T15:00:00Z')
      },
      {
        event_id: 5,
        user_id: 3,
        name: 'Akshay',
        phone_number: '7654321098',
        email: 'akshay@example.com',
        address: '321 Pine St, Mumbai',
        seats: 2,
        with_pet: true,
        pet_name: 'Milo',
        pet_breed: 'Persian',
        pet_dob: new Date('2021-01-20'),
        registration_date: new Date('2025-03-25T12:00:00Z')
      },
      {
        event_id: 5,
        user_id: null,
        name: 'Priya Sharma',
        phone_number: '9456789012',
        email: 'priya.sharma@example.com',
        address: '987 Maple Ln, Mumbai',
        seats: 4,
        with_pet: true,
        pet_name: 'Toby',
        pet_breed: 'Dachshund',
        pet_dob: new Date('2022-06-01'),
        registration_date: new Date('2025-03-26T09:15:00Z')
      },
      {
        event_id: 6,
        user_id: 1,
        name: 'Gautam Thota',
        phone_number: '9876543210',
        email: 'gautam.thota@example.com',
        address: '123 Main St, Chennai',
        seats: 1,
        with_pet: true,
        pet_name: 'Whiskers',
        pet_breed: 'Siamese',
        pet_dob: new Date('2020-09-25'),
        registration_date: new Date('2025-03-27T10:30:00Z')
      },
      {
        event_id: 6,
        user_id: null,
        name: 'Anita Rao',
        phone_number: '9567890123',
        email: 'anita.rao@example.com',
        address: '456 Birch Rd, Chennai',
        seats: 2,
        with_pet: true,
        pet_name: 'Snowball',
        pet_breed: 'Maine Coon',
        pet_dob: new Date('2021-04-12'),
        registration_date: new Date('2025-03-28T14:00:00Z')
      }
    ];

    await EventAttendee.insertMany(sampleEventAttendees);
    console.log('Sample event attendees inserted successfully');
  } catch (error) {
    console.error('Error inserting sample event attendees:', error.message);
  }
};

// Connect to MongoDB and insert sample data
async function connectToMongo(callback) {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Insert sample data for all collections
    await insertSampleUsers();
    await insertSampleVendors();
    await insertSampleEventManagers();
    await insertSampleProducts();
    await insertSampleProductVariants();
    await insertSampleProductImages();
    await insertSampleOrders();
    await insertSampleOrderItems();
    await insertSampleEvents();
    await insertSampleEventAttendees();

    if (callback) callback();
  } catch (err) {
    console.error('MongoDB connection error:', err);
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
  EventAttendee,
  insertSampleUsers,
  insertSampleVendors,
  insertSampleEventManagers,
  insertSampleProducts,
  insertSampleProductVariants,
  insertSampleProductImages,
  insertSampleOrders,
  insertSampleOrderItems,
  insertSampleEvents,
  insertSampleEventAttendees
};