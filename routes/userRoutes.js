// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { updateProfile, getUserInfo } = require('../controllers/userController');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
            return cb(new Error('Only image files (jpg, jpeg, png) are allowed'), false);
        }
        cb(null, true);
    }
});

// Multer error handling middleware
const uploadWithErrorHandling = (req, res, next) => {
    console.log('Received request to /update-profile');
    upload.single('profilePic')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: 'File upload error',
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: 'File upload error',
                error: err.message
            });
        }
        next();
    });
};

router.post('/update-profile', uploadWithErrorHandling, updateProfile);
router.get('/user-info', getUserInfo);

module.exports = router;