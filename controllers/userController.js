const mongoose = require('mongoose');
const { User } = require('../models/database');

const updateProfile = async (req, res) => {
    const { user_name, user_phone, user_address } = req.body;

    // Validate user_id from session
    if (!req.session.user || !mongoose.Types.ObjectId.isValid(req.session.user.id)) {
        return res.status(400).json({ success: false, message: 'Invalid user session or ID' });
    }
    const userId = new mongoose.Types.ObjectId(req.session.user.id);

    if (!user_name && !user_phone && !user_address && !req.file) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    if (user_name && user_name.length < 2) {
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }

    let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const updates = {};

    if (user_name) updates.user_name = user_name;
    if (user_phone) updates.user_phone = user_phone;
    if (user_address) updates.user_address = user_address;
    if (imageUrl) updates.profile_pic = imageUrl;

    try {
        const result = await User.updateOne(
            { _id: userId },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user_name) req.session.user.user_name = user_name;
        if (user_phone) req.session.user.user_phone = user_phone;
        if (user_address) req.session.user.user_address = user_address;
        if (imageUrl) req.session.user.profile_pic = imageUrl;

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: `Database update failed: ${err.message}` });
    }
};

const getUserInfo = (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: 'Not logged in' });
    }
};

module.exports = { updateProfile, getUserInfo };