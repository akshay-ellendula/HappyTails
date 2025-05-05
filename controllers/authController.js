const bcrypt = require('bcryptjs');
const { User } = require('../models/database');

const signup = async (req, res) => {
    const { user_name, user_email, user_password } = req.body;

    // Input validation
    if (!user_name || !user_email || !user_password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (user_name.length < 2) {
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (user_password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ user_email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(user_password, 10);

        // Create new user
        const newUser = new User({
            user_name,
            user_email,
            user_password: hashedPassword,
            user_phone: null,
            user_address: null,
            profile_pic: null,
            created_at: new Date()
        });

        await newUser.save();
        res.status(201).json({ success: true, message: 'Signup successful' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const login = async (req, res) => {
    const { user_email, user_password } = req.body;

    // Input validation
    if (!user_email || !user_password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    try {
        // Find user by email
        const user = await User.findOne({ user_email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(user_password, user.user_password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Set session data
        req.session.user = {
            id: user._id.toString(), // Convert ObjectId to string
            user_name: user.user_name,
            user_email: user.user_email,
            user_phone: user.user_phone || null,
            user_address: user.user_address || null,
            profile_pic: user.profile_pic || null
        };
        res.status(200).json({ success: true, redirect: '/home', message: 'Login successful' });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.status(200).json({ success: true, redirect: '/home', message: 'Logout successful' });
    });
};

module.exports = { signup, login, logout };