// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { adminLogin, getUsers, getUser, updateUser, deleteUser, getProducts, getUserStats, getProductStats, dashBoardStats, adminGetUsers } = require('../controllers/adminController');
const { isAdminAuthenticated } = require('../middleware/authMiddleware');

router.post('/admin-login', adminLogin);
router.get('/admin/users', isAdminAuthenticated, getUsers);
router.get('/admin/user/:id', isAdminAuthenticated, getUser);
router.put('/admin/user/:id', isAdminAuthenticated, updateUser);
router.delete('/admin/user/:id', isAdminAuthenticated, deleteUser);
router.get('/admin/products', isAdminAuthenticated, getProducts);
router.get('/admin/user-stats', isAdminAuthenticated, getUserStats);
router.get('/admin/product-stats', isAdminAuthenticated, getProductStats);
router.get('/admin/dashboard-stats', isAdminAuthenticated, dashBoardStats);
router.get('/admin/get-users', isAdminAuthenticated, adminGetUsers); // to get recent 5 users in admin dashboard

module.exports = router;