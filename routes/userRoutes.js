const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { updateProfile, getUserInfo } = require('../controllers/userController');

const storage = multer.diskStorage({
    destination: 'public/uploads/profile_pics/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/update-profile', upload.single('profilePic'), updateProfile);
router.get('/user-info', getUserInfo);

module.exports = router;