const express = require('express');
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Please log in first' });
    }
};

module.exports=(isAuthenticated);