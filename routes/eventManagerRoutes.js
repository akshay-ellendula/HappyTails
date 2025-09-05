const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { eventManagerSignup, eventDashbord, createNewEvent, updateAttende, deleteAttendee,
    getEvents, getEvent, updateEvent, getAttendes, eventAnalytics, getEventManagerProfile, upadatePassword,
    getEventsUser,registerEvent,myEvents,deleteTicket,postTicket,updateEventManagerProfile
} = require('../controllers/eventManagerController');
router.post('/event-manager-signup', eventManagerSignup);
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const isAuthenticated = (req, res, next) => {
    if (req.session.eventManager) {
        next();
    } else {
        console.log('No eventManager session, redirecting to login');
        res.redirect('/service_provider_login');
    }
};

router.get('/eventmanager_dashboard', isAuthenticated, eventDashbord);
router.post('/eventmanager_dashboard/create-event', isAuthenticated, upload.single('eventPhoto'), createNewEvent);
router.put('/eventmanager_dashboard/update-attendee/:id', isAuthenticated, updateAttende);
router.delete('/eventmanager_dashboard/delete-attendee/:id', isAuthenticated, deleteAttendee);
router.get('/eventmanager_events', isAuthenticated, getEvents);
router.get('/eventmanager_event_get', isAuthenticated, getEvent);
router.post('/eventmanager_events/update', isAuthenticated, updateEvent);
router.get('/eventmanager_attendees', isAuthenticated, getAttendes);
router.get('/eventmanager_analytics', isAuthenticated, eventAnalytics);
router.get('/eventmanager_profile', isAuthenticated, getEventManagerProfile);
router.post('/eventmanager_profile/password', isAuthenticated, upadatePassword);
router.get('/Events', getEventsUser);
router.get('/event_booking_form', registerEvent);
router.get('/api/my_events', myEvents);
router.delete('/api/cancel_event_booking/:attendeeId', deleteTicket);
router.post('/event_booking', postTicket);
router.post('/eventmanager_profile', isAuthenticated, upload.single('profilePic'), updateEventManagerProfile);
module.exports = router;