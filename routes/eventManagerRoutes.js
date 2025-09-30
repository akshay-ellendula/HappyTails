const express = require("express");
const router = express.Router();
const { eventManagerSignup, eventDashbord, createNewEvent, updateAttende, deleteAttendee,
    getEvents, getEvent, updateEvent, getAttendes, eventAnalytics, getEventManagerProfile, upadatePassword,
    getEventsUser,registerEvent,myEvents,deleteTicket,postTicket,updateEventManagerProfile,isAuthenticated,getEventDetails
} = require('../controllers/eventManagerController');
const {upload} = require("../utils/stroage.js");
router.post('/eventManagerSignup', eventManagerSignup);
router.get('/eventmanager_dashboard', isAuthenticated, eventDashbord);
router.post('/eventmanager_dashboard/createEvent', isAuthenticated, upload.single('eventPhoto'), createNewEvent);
router.put('/eventmanager_dashboard/updateAttendee/:id', isAuthenticated, updateAttende);
router.delete('/eventmanager_dashboard/deleteAttendee/:id', isAuthenticated, deleteAttendee);
router.get('/eventmanager_events', isAuthenticated, getEvents);
router.get('/eventmanager_event_get', isAuthenticated, getEvent);
router.post('/eventmanager_events/update', isAuthenticated, updateEvent);
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
router.post('/eventmanager_profile', isAuthenticated, upload.single('profilePic'), updateEventManagerProfile);
module.exports = router;