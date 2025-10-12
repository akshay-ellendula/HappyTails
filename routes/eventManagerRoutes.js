const express = require("express");
const router = express.Router();
const multer = require('multer');

const {
    signup,
    getDashboard,
    createEvent,
    updateAttendee,
    deleteAttendee,
    getManagerEvents,
    updateEvent,
    getAttendees,
    getAnalytics,
    getProfile,
    updatePassword,
    getPublicEvents,
    showBookingForm,
    getUserEvents,
    deleteTicket,
    postTicket,
    updateProfile,
    isAuthenticated,
    getEventDetails,
    showEditForm,
    getEventDetail,
    deleteEvent
} = require('../controllers/eventManagerController');

// Configure multer for memory storage (Base64 conversion)
const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({ storage: memoryStorage });

// ==================== PUBLIC ROUTES ====================//
router.get('/event-details/:id', getEventDetail);
router.post('/eventManagerSignup', signup);
router.get('/Events', getPublicEvents);
router.get('/eventDetails', getEventDetails);
router.get('/event_booking_form', showBookingForm);
router.post('/event_booking', postTicket);

// ==================== AUTHENTICATED ROUTES ====================//
// Dashboard routes
router.get('/eventmanager_dashboard', isAuthenticated, getDashboard);
router.post('/eventmanager_dashboard/createEvent', isAuthenticated, memoryUpload.single('eventPhoto'), createEvent);

// Attendee management routes
router.put('/eventmanager_dashboard/updateAttendee/:id', isAuthenticated, updateAttendee);
router.delete('/eventmanager_dashboard/deleteAttendee/:id', isAuthenticated, deleteAttendee);

// Event management routes
router.get('/eventmanager_events', isAuthenticated, getManagerEvents);
router.post('/eventmanager_events/update', isAuthenticated, memoryUpload.single('eventPhoto'), updateEvent);
router.get("/eventmanager_event_edit", isAuthenticated, showEditForm);

// Analytics routes
router.get('/eventmanager_analytics', isAuthenticated, getAnalytics);

// Attendee routes
router.get('/eventmanager_attendees', isAuthenticated, getAttendees);

// Profile routes
router.get('/eventmanager_profile', isAuthenticated, getProfile);
router.post('/eventmanager_profile', isAuthenticated, memoryUpload.single('profilePic'), updateProfile);
router.post('/eventmanager_profile/password', isAuthenticated, updatePassword);

// User event routes
router.get('/api/my_events', getUserEvents);
router.delete('/api/cancel_event_booking/:attendeeId', deleteTicket);
router.delete("/api/deleteEvent/:id",deleteEvent);

module.exports = router;