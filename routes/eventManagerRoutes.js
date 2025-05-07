const express = require('express');
const router = express.Router();
const eventManagerController = require('../controllers/eventManagerController'); // Adjust path to your controller
// const upload = require('../middleware/upload'); // Multer middleware for file uploads

// Event manager dashboard route
router.get('/event-manager/dashboard', eventManagerController.renderEventManagerDashboard);

// Event and attendee management routes
// router.post('/eventmanager_dashboard/create-event', upload.single('eventPhoto'), eventManagerController.createEvent);
router.put('/eventmanager_dashboard/update-attendee/:id', eventManagerController.updateAttendee);
router.delete('/eventmanager_dashboard/delete-attendee/:id', eventManagerController.deleteAttendee);

module.exports = router;