const bcrypt = require('bcrypt');
const { Vendor, EventManager } = require('../models/database'); // Adjust path to your database.js

// Render login page
exports.renderLoginPage = (req, res) => {
  const errorMessage = req.session.errorMessage || '';
  delete req.session.errorMessage; // Clear error after displaying
  res.render('service_provider_login', { title: 'Service Provider Login', errorMessage });
};

// Login controller for service providers
exports.loginProvider = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Select model based on role
    let user;
    if (role === 'store-manager') {
      user = await Vendor.findOne({ email });
    } else if (role === 'event-manager') {
      user = await EventManager.findOne({ email });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Check if user exists
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or role' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Store user data in session
    req.session.user = {
      id: user._id,
      email: user.email,
      role
    };

    // Determine redirect URL based on role
    const redirect = role === 'event-manager' ? '/eventmanager_dashboard' : '/shop-dashboard';

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      redirect
    });
  } catch (error) {
    console.error('Provider login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Render event manager dashboard
exports.renderEventManagerDashboard = (req, res) => {
  if (!req.session.user || req.session.user.role !== 'event-manager') {
    req.session.errorMessage = 'Please log in as an Event Manager';
    return res.redirect('/service_provider_login');
  }
  res.render('eventmanager_dashboard', { user: req.session.user });
};

// Render store manager dashboard
exports.renderStoreManagerDashboard = (req, res) => {
  if (!req.session.user || req.session.user.role !== 'store-manager') {
    req.session.errorMessage = 'Please log in as a Store Manager';
    return res.redirect('/service_provider_login');
  }
  res.render('shop-dashboard', { user: req.session.user });
};