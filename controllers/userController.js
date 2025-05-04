const { User } = require('../models/database');

const updateProfile = async (req, res) => {
    const { name, phone, address } = req.body;
    const email = req.session.user.email;

    if (!name && !phone && !address && !req.file) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    if (name && name.length < 2) {
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }

    const imageUrl = req.file ? `/Uploads/${req.file.filename}` : null;
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;
    if (imageUrl) updates.profile_pic = imageUrl;

    try {
        const user = await User.findOneAndUpdate(
            { email },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (name) req.session.user.name = name;
        if (phone) req.session.user.phone = phone;
        if (address) req.session.user.address = address;
        if (imageUrl) req.session.user.profile_pic = imageUrl;

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ success: false, message: 'Server error' });
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