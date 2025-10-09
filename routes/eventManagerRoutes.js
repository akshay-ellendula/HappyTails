const express = require("express");
const router = express.Router();
const { eventManagerSignup, eventDashbord, createNewEvent, updateAttende, deleteAttendee,
    getEvents, getEvent, updateEvent, getAttendes, eventAnalytics, getEventManagerProfile, upadatePassword,
    getEventsUser, registerEvent, myEvents, deleteTicket, postTicket, updateEventManagerProfile, isAuthenticated, getEventDetails,
    editEvent, getEventDetail
} = require('../controllers/eventManagerController');
// Remove this line: const {upload} = require("../utils/stroage.js");  // Assuming it's disk storage, we don't need it

// Add these lines: Import multer and define memory storage (like in vendorController.js)
const multer = require('multer');
const memoryStorage = multer.memoryStorage();  // Store in memory for Base64 conversion
const memoryUpload = multer({ storage: memoryStorage });

router.get('/event-details/:id', getEventDetail);
router.post('/eventManagerSignup', eventManagerSignup);
router.get('/eventmanager_dashboard', isAuthenticated, eventDashbord);
// Change to memoryUpload here (instead of upload)
router.post('/eventmanager_dashboard/createEvent', isAuthenticated, memoryUpload.single('eventPhoto'), createNewEvent);
router.put('/eventmanager_dashboard/updateAttendee/:id', isAuthenticated, updateAttende);
router.delete('/eventmanager_dashboard/deleteAttendee/:id', isAuthenticated, deleteAttendee);
router.get('/eventmanager_events', isAuthenticated, getEvents);
// router.get('/eventmanager_event_get',getEvent);
// If updateEvent handles image uploads, change its middleware similarly (assuming it uses post and upload.single)
router.post('/eventmanager_events/update', isAuthenticated, memoryUpload.single('eventPhoto'), updateEvent);  // Add memoryUpload if it has file upload
router.get('/eventmanager_attendees', isAuthenticated, getAttendes);
router.get('/eventmanager_analytics', isAuthenticated, eventAnalytics);
router.get('/eventmanager_profile', isAuthenticated, getEventManagerProfile);
router.post('/eventmanager_profile/password', isAuthenticated, upadatePassword);
router.get('/Events', getEventsUser);
router.get('/eventDetails', getEventDetails); 
router.get('/event_booking_form', registerEvent);
router.get('/api/my_events', myEvents);
router.delete('/api/cancel_event_booking/:attendeeId', deleteTicket);
router.post('/event_booking', postTicket);
// For profile update, if you want Base64 here too, change to memoryUpload (see optional changes below)
router.post('/eventmanager_profile', isAuthenticated, memoryUpload.single('profilePic'), updateEventManagerProfile);
router.get("/eventmanager_event_edit", isAuthenticated,editEvent);

module.exports = router;