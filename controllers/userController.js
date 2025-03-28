// controllers/userController.js
const { db } = require('../models/database');

const updateProfile = (req, res) => {
    const { user_name, user_phone, user_address } = req.body;
    const user_email = req.session.user.user_email;

    if (!user_name && !user_phone && !user_address && !req.file) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    if (user_name && user_name.length < 2) {
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }

    let imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    let query = "UPDATE users SET ";
    const values = [];
    const updates = [];

    if (user_name) { updates.push("user_name=?"); values.push(user_name); }
    if (user_phone) { updates.push("user_phone=?"); values.push(user_phone); }
    if (user_address) { updates.push("user_address=?"); values.push(user_address); }
    if (imageUrl) { updates.push("profile_pic=?"); values.push(imageUrl); }

    query += updates.join(", ") + " WHERE user_email=?";
    values.push(user_email);

    db.run(query, values, function (err) {
        if (err) return res.status(500).json({ success: false, message: "Database update failed" });

        if (user_name) req.session.user.user_name = user_name;
        if (user_phone) req.session.user.user_phone = user_phone;
        if (user_address) req.session.user.user_address = user_address;
        if (imageUrl) req.session.user.profile_pic = imageUrl;

        res.json({ success: true, message: 'Profile updated successfully' });
    });
};

const getUserInfo = (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: 'Not logged in' });
    }
};

module.exports = { updateProfile, getUserInfo };