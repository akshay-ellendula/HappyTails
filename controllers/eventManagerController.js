const bcrypt = require('bcryptjs');
const { EventManager } = require('../models/database');

const eventManagerSignup = async (req, res) => {
    const { name, contactnumber, email, password, confirmpassword, companyname, location, termsandconditions } = req.body;

    // Validation: Check if all fields are provided
    if (!name || !contactnumber || !email || !password || !confirmpassword || !companyname || !location || termsandconditions === undefined) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Validation: Name must be at least 2 characters
    if (name.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'name', message: 'Name must be at least 2 characters long' }]
        });
    }

    // Validation: Contact number must be a 10-digit number
    if (!/^\d{10}$/.test(contactnumber)) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'contactnumber', message: 'Please enter a valid 10-digit phone number' }]
        });
    }

    // Validation: Email must be a valid format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'email', message: 'Please enter a valid email address' }]
        });
    }

    // Validation: Password must be at least 8 characters and contain a number
    if (password.length < 8 || !/\d/.test(password)) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'password', message: 'Password must be at least 8 characters long and contain a number' }]
        });
    }

    // Validation: Confirm password must match password
    if (password !== confirmpassword) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'confirmpassword', message: 'Passwords do not match' }]
        });
    }

    // Validation: Company name must be at least 2 characters
    if (companyname.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'companyname', message: 'Company name must be at least 2 characters long' }]
        });
    }

    // Validation: Location must be at least 3 characters
    if (location.length < 3) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'location', message: 'Please enter a valid location (minimum 3 characters)' }]
        });
    }

    // Validation: Terms and conditions must be accepted
    if (!termsandconditions) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{ field: 'terms', message: 'You must agree to the terms and conditions' }]
        });
    }

    try {
        // Check if email already exists in EventManager collection
        const existingEventManager = await EventManager.findOne({ email });
        if (existingEventManager) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: [{ field: 'email', message: 'Email already registered' }]
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new event manager
        await EventManager.create({
            name,
            contact_number: contactnumber,
            email,
            password: hashedPassword,
            company_name: companyname,
            location
        });

        res.status(201).json({
            success: true,
            redirect: '/service_provider_login',
            message: 'Event manager signup successful'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { eventManagerSignup };