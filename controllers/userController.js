const { User } = require('../models/database');

const updateProfile = async (req, res) => {
    const { user_name, user_phone, user_address } = req.body;
    const user_email = req.session.user.user_email;

    if (!user_name && !user_phone && !user_address && !req.file) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    if (user_name && user_name.length < 2) {
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }

    try {
        const updateFields = {};
        if (user_name) updateFields.user_name = user_name;
        if (user_phone) updateFields.user_phone = user_phone;
        if (user_address) updateFields.user_address = user_address;
        if (req.file) {
            
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            updateFields.profile_pic = base64Image;
        }

        await User.updateOne(
            { user_email },
            { $set: updateFields }
        );

        // Update session with new values
        if (user_name) req.session.user.user_name = user_name;
        if (user_phone) req.session.user.user_phone = user_phone;
        if (user_address) req.session.user.user_address = user_address;
        if (req.file) req.session.user.profile_pic = updateFields.profile_pic;

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ success: false, message: 'Database update failed' });
    }
};

const getUserInfo = (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.json({ success: false, message: 'Not logged in' });
    }
};

const userLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Server error');
        }
        res.redirect('/my_login');
    });
};

module.exports = { updateProfile, getUserInfo, userLogout };