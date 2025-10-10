const express = require('express');
const router = express.Router();
const policiesController = require('../controllers/policiesController');

router.get('/privacy', policiesController.renderPrivacy);
router.get('/refund', policiesController.renderRefund);
router.get('/cancellation', policiesController.renderCancellation);
router.get('/terms', policiesController.renderTerms);

module.exports = router;