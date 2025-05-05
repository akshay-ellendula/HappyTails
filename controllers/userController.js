const mongoose = require('mongoose');
const { User } = require('../models/database');

const updateProfile = async (req, res) => {
    console.log('Received updateProfile request:', {
        body: req.body,
        file: req.file,
        session: req.session.user
    });

    // Validate user_id from session
    if (!req.session.user || !req.session.user.id) {
        console.error('Invalid user session:', req.session.user);
        return res.status(400).json({
            success: false,
            message: 'Invalid user session',
            error: 'User session not found'
        });
    }
    
    const userIdString = req.session.user.id;
    console.log('User ID from session:', userIdString);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userIdString)) {
        console.error('Invalid ObjectId:', userIdString);
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID in session',
            error: 'Invalid ObjectId format'
        });
    }
    const userId = new mongoose.Types.ObjectId(userIdString);

    const { user_name, user_phone, user_address } = req.body;

    // Check if there are any fields to update
    if (!user_name && !user_phone && !user_address && !req.file) {
        return res.status(400).json({
            success: false,
            message: 'No fields to update',
            error: 'At least one field must be provided'
        });
    }

    // Input validation
    if (user_name && user_name.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: 'Name must be at least 2 characters'
        });
    }
    if (user_phone && !/^[0-9]{10}$/.test(user_phone)) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: 'Phone must be a 10-digit number'
        });
    }
    if (user_address && user_address.length < 5) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: 'Address must be at least 5 characters'
        });
    }

    // Prepare updates
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const updates = {};

    if (user_name) updates.user_name = user_name;
    if (user_phone || user_phone === '') updates.user_phone = user_phone || null;
    if (user_address || user_address === '') updates.user_address = user_address || null;
    if (imageUrl) updates.profile_pic = imageUrl;

    console.log('Prepared updates:', updates);

    try {
        const result = await User.updateOne(
            { _id: userId },
            { $set: updates }
        );

        console.log('Database update result:', result);

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'No matching user found in database'
            });
        }

        // Update session data
        if (user_name) req.session.user.user_name = user_name;
        if (user_phone || user_phone === '') req.session.user.user_phone = user_phone || null;
        if (user_address || user_address === '') req.session.user.user_address = user_address || null;
        if (imageUrl) req.session.user.profile_pic = imageUrl;

        console.log('Updated session data:', req.session.user);

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({
            success: false,
            message: 'Database update failed',
            error: err.message || 'Unknown database error'
        });
    }
};

const getUserInfo = (req, res) => {
    console.log('Received getUserInfo request, session:', req.session.user);
    if (req.session.user) {
        res.json({
            success: true,
            user: {
                id: req.session.user.id,
                user_name: req.session.user.user_name,
                user_email: req.session.user.user_email,
                user_phone: req.session.user.user_phone,
                user_address: req.session.user.user_address,
                profile_pic: req.session.user.profile_pic
            }
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Not logged in',
            error: 'User session not found'
        });
    }
};

module.exports = { updateProfile, getUserInfo };