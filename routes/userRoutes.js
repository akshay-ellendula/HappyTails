const express = require('express');
const router = express.Router();
const multer = require('multer');
const { updateProfile, getUserInfo, userLogout } = require('../controllers/userController');

// Use memory storage to keep file in buffer for base64 conversion
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

router.post('/update-profile', upload.single('profilePic'), updateProfile);
router.get('/user-info', getUserInfo);
router.get('/user_logout', userLogout);

module.exports = router;