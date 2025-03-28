// controllers/serviceProviderController.js
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');

const serviceProviderLogin = async (req, res) => {
    const { email, password, role } = req.body;

    // Validate role
    const validRoles = ['store-manager', 'event-manager'];
    if (!validRoles.includes(role)) {
        return res.json({
            success: false,
            message: "Invalid role. Please select a valid role."
        });
    }

    try {
        let user;
        let redirect;

        // Determine which table to query based on the role
        if (role === 'store-manager') {
            // Query the store_managers table
            const query = `SELECT * FROM store_managers WHERE email = ?`;
            user = await new Promise((resolve, reject) => {
                db.get(query, [email], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });
            redirect = '/store-dashboard'; // Adjust this to your actual store manager dashboard route
        } else if (role === 'event-manager') {
            // Query the event_managers table
            const query = `SELECT * FROM event_managers WHERE email = ?`;
            user = await new Promise((resolve, reject) => {
                db.get(query, [email], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });
            redirect = '/eventmanager_dashboard'; // Matches the route in eventManagerRoutes.js
        }

        // Check if user exists
        if (!user) {
            return res.json({
                success: false,
                message: "Invalid email or role"
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Store user info in session based on role
        if (role === 'store-manager') {
            req.session.storeManagerId = user.id;
        } else if (role === 'event-manager') {
            req.session.eventManagerId = user.id;
        }

        // Successful login
        return res.json({
            success: true,
            message: "Login successful!",
            redirect: redirect
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.json({
            success: false,
            message: "An error occurred during login"
        });
    }
};

module.exports = { serviceProviderLogin };