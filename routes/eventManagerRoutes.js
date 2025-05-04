const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const { Event, EventAttendee, EventManager } = require('../models/connection');
const { eventManagerSignup } = require('../controllers/eventManagerController');

// Route for event manager signup (already updated in controller)
router.post('/event-manager-signup', eventManagerSignup);

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Middleware to check if event manager is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.eventManager) {
        next();
    } else {
        console.log('No eventManager session, redirecting to login');
        res.redirect('/service_provider_login');
    }
};

// GET /eventmanager_dashboard - Dashboard with overview, events, and attendees
router.get('/eventmanager_dashboard', isAuthenticated, async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;

        // Fetch overview metrics
        const overview = await Event.aggregate([
            { $match: { event_manager_id: new mongoose.Types.ObjectId(eventManagerId) } },
            {
                $group: {
                    _id: null,
                    totalEvents: { $sum: 1 },
                    totalBookings: { $sum: "$tickets_sold" },
                    totalEarnings: { $sum: { $multiply: ["$tickets_sold", "$ticket_price"] } }
                }
            }
        ]);
        const overviewData = overview[0] || { totalEvents: 0, totalBookings: 0, totalEarnings: 0 };

        // Fetch ongoing events (limit to 3)
        const ongoingEvents = await Event.find({
            event_manager_id: eventManagerId,
            status: 'Ongoing'
        }).limit(3).lean();

        // Fetch upcoming events (limit to 3)
        const upcomingEvents = await Event.find({
            event_manager_id: eventManagerId,
            status: 'Upcoming'
        }).limit(3).lean();

        // Fetch attendees (limit to 3)
        const attendees = await EventAttendee.aggregate([
            {
                $lookup: {
                    from: 'events',
                    localField: 'event_id',
                    foreignField: '_id',
                    as: 'event'
                }
            },
            { $unwind: '$event' },
            { $match: { 'event.event_manager_id': new mongoose.Types.ObjectId(eventManagerId) } },
            {
                $project: {
                    id: '$_id',
                    name: 1,
                    phone_number: 1,
                    seats: 1,
                    event_name: '$event.event_name',
                    event_date: '$event.date_time'
                }
            },
            { $limit: 3 }
        ]);

        res.render('eventmanager_dashboard', {
            overview: overviewData,
            ongoingEvents,
            upcomingEvents,
            attendees,
            eventManager: req.session.eventManager
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST /eventmanager_dashboard/create-event - Create a new event
router.post('/eventmanager_dashboard/create-event', isAuthenticated, upload.single('eventPhoto'), async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;
        const {
            eventName, aboutEvent, language, duration, tickets, ageLimit,
            instructions, venue, terms, category, dateTime
        } = req.body;
        const image = req.file ? `/images/${req.file.filename}` : null;

        await Event.create({
            event_manager_id: eventManagerId,
            event_name: eventName,
            about_event: aboutEvent,
            language,
            duration,
            ticket_price: parseFloat(tickets),
            age_limit: parseInt(ageLimit),
            instructions,
            venue,
            terms,
            category,
            date_time: new Date(dateTime),
            status: 'Upcoming',
            city: 'Hyderabad',
            contact_number: '1234567890',
            image
        });

        res.status(200).json({ message: 'Event created successfully' });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Error creating event' });
    }
});

// PUT /eventmanager_dashboard/update-attendee/:id - Update an attendee
router.put('/eventmanager_dashboard/update-attendee/:id', isAuthenticated, async (req, res) => {
    try {
        const attendeeId = req.params.id;
        const { name, phone_number, seats } = req.body;

        await EventAttendee.updateOne(
            { _id: attendeeId },
            { name, phone_number, seats: parseInt(seats) }
        );

        res.status(200).json({ message: 'Attendee updated successfully' });
    } catch (error) {
        console.error('Error updating attendee:', error);
        res.status(500).json({ message: 'Error updating attendee' });
    }
});

// DELETE /eventmanager_dashboard/delete-attendee/:id - Delete an attendee
router.delete('/eventmanager_dashboard/delete-attendee/:id', isAuthenticated, async (req, res) => {
    try {
        const attendeeId = req.params.id;

        await EventAttendee.deleteOne({ _id: attendeeId });

        res.status(200).json({ message: 'Attendee deleted successfully' });
    } catch (error) {
        console.error('Error deleting attendee:', error);
        res.status(500).json({ message: 'Error deleting attendee' });
    }
});

// GET /eventmanager_events - Fetch events for the dashboard
router.get('/eventmanager_events', isAuthenticated, async (req, res) => {
    const eventManagerId = req.session.eventManager.id;
    const today = new Date();

    const [previousEvents, ongoingEvents, upcomingEvents] = await Promise.all([
        // Previous events (Past or before today)
        Event.aggregate([
            { $match: { 
                event_manager_id: new mongoose.Types.ObjectId(eventManagerId),
                $or: [{ status: 'Past' }, { date_time: { $lt: today } }]
            }},
            {
                $lookup: {
                    from: 'eventattendees',
                    localField: '_id',
                    foreignField: 'event_id',
                    as: 'attendees'
                }
            },
            {
                $project: {
                    id: '$_id',
                    event_name: 1,
                    tickets_sold: 1,
                    ticket_price: 1,
                    date_time: 1,
                    image: 1,
                    attendeeCount: { $size: '$attendees' },
                    revenue: { $multiply: ['$ticket_price', { $sum: '$attendees.seats' }] },
                    time: {
                        $dateToString: { format: '%I:%M %p', date: '$date_time' }
                    },
                    formattedDate: {
                        $dateToString: { format: '%B %d, %Y, %I:%M %p', date: '$date_time' }
                    }
                }
            }
        ]),
        // Ongoing events (status = 'Ongoing' and on today)
        Event.aggregate([
            { $match: { 
                event_manager_id: new mongoose.Types.ObjectId(eventManagerId),
                status: 'Ongoing',
                date_time: {
                    $gte: new Date(today.setHours(0, 0, 0, 0)),
                    $lt: new Date(today.setHours(23, 59, 59, 999))
                }
            }},
            {
                $lookup: {
                    from: 'eventattendees',
                    localField: '_id',
                    foreignField: 'event_id',
                    as: 'attendees'
                }
            },
            {
                $project: {
                    id: '$_id',
                    event_name: 1,
                    tickets_sold: 1,
                    ticket_price: 1,
                    date_time: 1,
                    image: 1,
                    attendeeCount: { $size: '$attendees' },
                    revenue: { $multiply: ['$ticket_price', { $sum: '$attendees.seats' }] },
                    time: {
                        $dateToString: { format: '%I:%M %p', date: '$date_time' }
                    },
                    formattedDate: {
                        $dateToString: { format: '%B %d, %Y, %I:%M %p', date: '$date_time' }
                    }
                }
            }
        ]),
        // Upcoming events (status = 'Upcoming' and after today)
        Event.aggregate([
            { $match: { 
                event_manager_id: new mongoose.Types.ObjectId(eventManagerId),
                status: 'Upcoming',
                date_time: { $gt: today }
            }},
            {
                $lookup: {
                    from: 'eventattendees',
                    localField: '_id',
                    foreignField: 'event_id',
                    as: 'attendees'
                }
            },
            {
                $project: {
                    id: '$_id',
                    event_name: 1,
                    tickets_sold: 1,
                    ticket_price: 1,
                    total_tickets: 1,
                    date_time: 1,
                    image: 1,
                    attendeeCount: { $size: '$attendees' },
                    revenue: { $multiply: ['$ticket_price', { $sum: '$attendees.seats' }] },
                    time: {
                        $dateToString: { format: '%I:%M %p', date: '$date_time' }
                    },
                    formattedDate: {
                        $dateToString: { format: '%B %d, %Y, %I:%M %p', date: '$date_time' }
                    }
                }
            }
        ])
    ]);

    res.render('eventmanager_events', {
        previousEvents,
        ongoingEvents,
        upcomingEvents
    });
});

// POST /eventmanager_events/update - Update event
router.post('/eventmanager_events/update', isAuthenticated, async (req, res) => {
    try {
        const { eventId, eventName, eventDate, eventTime, eventVenue, eventCapacity, eventTicketPrice, eventDescription } = req.body;
        const eventManagerId = req.session.eventManager.id;

        const eventDateTime = new Date(`${eventDate} ${eventTime}:00`);

        await Event.updateOne(
            { _id: eventId, event_manager_id: eventManagerId },
            {
                event_name: eventName,
                date_time: eventDateTime,
                venue: eventVenue,
                total_tickets: parseInt(eventCapacity),
                ticket_price: parseFloat(eventTicketPrice),
                about_event: eventDescription
            }
        );

        res.redirect('/eventmanager_events');
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ success: false, message: 'Failed to update event' });
    }
});

// GET /eventmanager_attendees - Fetch attendees
router.get('/eventmanager_attendees', isAuthenticated, async (req, res) => {
    const eventManagerId = req.session.eventManager.id;
    const today = new Date();

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (date) => {
        if (!date) return 'N/A';
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const [pastOngoingAttendees, upcomingAttendees] = await Promise.all([
        // Past and Ongoing Attendees
        EventAttendee.aggregate([
            {
                $lookup: {
                    from: 'events',
                    localField: 'event_id',
                    foreignField: '_id',
                    as: 'event'
                }
            },
            { $unwind: '$event' },
            {
                $match: {
                    'event.event_manager_id': new mongoose.Types.ObjectId(eventManagerId),
                    $or: [
                        { 'event.status': { $in: ['Past', 'Ongoing'] } },
                        { 'event.date_time': { $lte: today } }
                    ]
                }
            },
            {
                $group: {
                    _id: '$event._id',
                    event: { $first: '$event' },
                    attendees: { $push: '$$ROOT' },
                    totalAttendees: { $sum: 1 }
                }
            },
            {
                $project: {
                    id: '$_id',
                    name: 1,
                    email: 1,
                    registration_date: 1,
                    seats: 1,
                    event_id: '$event._id',
                    event_name: '$event.event_name',
                    date_time: '$event.date_time',
                    totalAttendees: 1,
                    eventTime: { $dateToString: { format: '%I:%M %p', date: '$event.date_time' } },
                    formattedDate: { $dateToString: { format: '%B %d, %Y', date: '$event.date_time' } },
                    formattedRegDate: { $dateToString: { format: '%B %d, %Y', date: '$registration_date' } }
                }
            },
            { $sort: { 'event.date_time': -1 } }
        ]).then(results => results.flatMap(result => result.attendees.map(attendee => ({
            ...attendee,
            event_id: result.event_id,
            event_name: result.event_name,
            date_time: result.date_time,
            totalAttendees: result.totalAttendees,
            eventTime: formatTime(result.date_time),
            formattedDate: formatDate(result.date_time),
            formattedRegDate: formatDate(attendee.registration_date)
        })))),
        // Upcoming Attendees
        EventAttendee.aggregate([
            {
                $lookup: {
                    from: 'events',
                    localField: 'event_id',
                    foreignField: '_id',
                    as: 'event'
                }
            },
            { $unwind: '$event' },
            {
                $match: {
                    'event.event_manager_id': new mongoose.Types.ObjectId(eventManagerId),
                    'event.status': 'Upcoming',
                    'event.date_time': { $gt: today }
                }
            },
            {
                $project: {
                    id: '$_id',
                    name: 1,
                    email: 1,
                    registration_date: 1,
                    seats: 1,
                    event_id: '$event._id',
                    event_name: '$event.event_name',
                    date_time: '$event.date_time',
                    eventTime: { $dateToString: { format: '%I:%M %p', date: '$event.date_time' } },
                    formattedDate: { $dateToString: { format: '%B %d, %Y', date: '$event.date_time' } },
                    formattedRegDate: { $dateToString: { format: '%B %d, %Y', date: '$registration_date' } }
                }
            },
            { $sort: { 'event.date_time': 1 } }
        ])
    ]);

    res.render('eventmanager_attendees', {
        pastOngoingAttendees,
        upcomingAttendees
    });
});

// GET /eventmanager_analytics - Fetch analytics
router.get('/eventmanager_analytics', isAuthenticated, async (req, res) => {
    const eventManagerId = req.session.eventManager.id;
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today);
    startOfMonth.setDate(1);

    const [revenueData, attendeesData, avgTicketData] = await Promise.all([
        // Revenue Data
        Event.aggregate([
            { $match: { event_manager_id: new mongoose.Types.ObjectId(eventManagerId) } },
            {
                $lookup: {
                    from: 'eventattendees',
                    localField: '_id',
                    foreignField: 'event_id',
                    as: 'attendees'
                }
            },
            {
                $project: {
                    revenue: { $multiply: ['$ticket_price', { $sum: '$attendees.seats' }] },
                    date_time: 1
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$revenue' },
                    todayRevenue: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: [
                                        { $dateToString: { format: '%Y-%m-%d', date: '$date_time' } },
                                        { $dateToString: { format: '%Y-%m-%d', date: today } }
                                    ]
                                },
                                then: '$revenue',
                                else: 0
                            }
                        }
                    },
                    thisWeekRevenue: {
                        $sum: {
                            $cond: {
                                if: { $gte: ['$date_time', startOfWeek] },
                                then: '$revenue',
                                else: 0
                            }
                        }
                    },
                    thisMonthRevenue: {
                        $sum: {
                            $cond: {
                                if: { $gte: ['$date_time', startOfMonth] },
                                then: '$revenue',
                                else: 0
                            }
                        }
                    }
                }
            }
        ]).then(result => result[0] || { totalRevenue: 0, todayRevenue: 0, thisWeekRevenue: 0, thisMonthRevenue: 0 }),
        // Attendees Data
        EventAttendee.aggregate([
            {
                $lookup: {
                    from: 'events',
                    localField: 'event_id',
                    foreignField: '_id',
                    as: 'event'
                }
            },
            { $unwind: '$event' },
            { $match: { 'event.event_manager_id': new mongoose.Types.ObjectId(eventManagerId) } },
            {
                $group: {
                    _id: null,
                    totalAttendees: { $sum: 1 },
                    todayAttendees: {
                        $sum: {
                            $cond: {
                                if: {
                                    $eq: [
                                        { $dateToString: { format: '%Y-%m-%d', date: '$registration_date' } },
                                        { $dateToString: { format: '%Y-%m-%d', date: today } }
                                    ]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    thisWeekAttendees: {
                        $sum: {
                            $cond: {
                                if: { $gte: ['$registration_date', startOfWeek] },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    thisMonthAttendees: {
                        $sum: {
                            $cond: {
                                if: { $gte: ['$registration_date', startOfMonth] },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                }
            }
        ]).then(result => result[0] || { totalAttendees: 0, todayAttendees: 0, thisWeekAttendees: 0, thisMonthAttendees: 0 }),
        // Average Ticket Price Data
        Event.aggregate([
            { $match: { event_manager_id: new mongoose.Types.ObjectId(eventManagerId), ticket_price: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    avgTotal: { $avg: '$ticket_price' },
                    avgToday: {
                        $avg: {
                            $cond: {
                                if: {
                                    $eq: [
                                        { $dateToString: { format: '%Y-%m-%d', date: '$date_time' } },
                                        { $dateToString: { format: '%Y-%m-%d', date: today } }
                                    ]
                                },
                                then: '$ticket_price',
                                else: null
                            }
                        }
                    },
                    avgThisWeek: {
                        $avg: {
                            $cond: {
                                if: { $gte: ['$date_time', startOfWeek] },
                                then: '$ticket_price',
                                else: null
                            }
                        }
                    },
                    avgThisMonth: {
                        $avg: {
                            $cond: {
                                if: { $gte: ['$date_time', startOfMonth] },
                                then: '$ticket_price',
                                else: null
                            }
                        }
                    }
                }
            }
        ]).then(result => result[0] || { avgTotal: 0, avgToday: 0, avgThisWeek: 0, avgThisMonth: 0 })
    ]);

    const revenue = {
        total: revenueData.totalRevenue || 0,
        today: revenueData.todayRevenue || 0,
        thisWeek: revenueData.thisWeekRevenue || 0,
        thisMonth: revenueData.thisMonthRevenue || 0,
        todayChange: revenueData.todayRevenue ? 15 : 0,
        thisWeekChange: revenueData.thisWeekRevenue ? 8 : 0,
        thisMonthChange: revenueData.thisMonthRevenue ? 12 : 0
    };

    const attendees = {
        total: attendeesData.totalAttendees || 0,
        today: attendeesData.todayAttendees || 0,
        thisWeek: attendeesData.thisWeekAttendees || 0,
        thisMonth: attendeesData.thisMonthAttendees || 0,
        todayChange: attendeesData.todayAttendees ? 16 : 0,
        thisWeekChange: attendeesData.thisWeekAttendees ? 10 : 0,
        thisMonthChange: attendeesData.thisMonthAttendees ? 22 : 0
    };

    const avgTicketValue = {
        total: avgTicketData.avgTotal || 0,
        today: avgTicketData.avgToday || 0,
        thisWeek: avgTicketData.avgThisWeek || 0,
        thisMonth: avgTicketData.avgThisMonth || 0,
        todayChange: avgTicketData.avgToday ? 7 : 0,
        thisWeekChange: avgTicketData.avgThisWeek ? 3 : 0,
        thisMonthChange: avgTicketData.avgThisMonth ? 1.5 : 0
    };

    res.render('eventmanager_analytics', {
        revenue,
        attendees,
        avgTicketValue
    });
});

const bcrypt = require('bcrypt');

// GET /eventmanager_profile - Render profile page
router.get('/eventmanager_profile', isAuthenticated, async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;

        const eventManager = await EventManager.findById(eventManagerId).lean();
        if (!eventManager) {
            return res.status(404).render('error', { message: 'Event manager not found' });
        }

        const eventsManaged = await Event.countDocuments({ event_manager_id: eventManagerId });

        const [firstName, ...lastNameParts] = eventManager.name.split(' ');
        const lastName = lastNameParts.join(' ');
        const phoneRaw = eventManager.contact_number;
        const phone = phoneRaw ? `+91 ${phoneRaw.substring(0, 5)} ${phoneRaw.substring(5)}` : 'N/A';

        const profile = {
            name: eventManager.name,
            firstName,
            lastName,
            email: eventManager.email,
            phone,
            phoneRaw,
            eventType: 'Pet Events',
            license: `EVENT-${eventManagerId}-AB`,
            bio: `Experienced event manager specializing in pet events. Based in ${eventManager.location}, working with ${eventManager.company_name}.`,
            eventsManaged,
            memberSince: 'January 15, 2023',
            image: null
        };

        res.render('eventmanager_profile', { profile });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).render('error', { message: 'Failed to load profile', error: error.message });
    }
});

// POST /eventmanager_profile - Update profile
router.post('/eventmanager_profile', isAuthenticated, upload.single('profilePic'), async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;
        const { firstName, lastName, email, phone, eventType, license, bio } = req.body;
        const name = `${firstName} ${lastName}`.trim();
        const contact_number = phone.replace(/\D/g, '').slice(-10);

        await EventManager.updateOne(
            { _id: eventManagerId },
            { name, email, contact_number }
        );

        res.redirect('/eventmanager_profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// POST /eventmanager_profile/password - Update password
router.post('/eventmanager_profile/password', isAuthenticated, async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;
        const { currentPassword, newPassword } = req.body;

        const eventManager = await EventManager.findById(eventManagerId);
        if (!eventManager) {
            return res.status(404).json({ success: false, message: 'Event manager not found' });
        }

        const match = await bcrypt.compare(currentPassword, eventManager.password);
        if (!match) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await EventManager.updateOne({ _id: eventManagerId }, { password: hashedPassword });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
});

// GET /Events - Fetch upcoming events
router.get('/Events', async (req, res) => {
    try {
        const city = req.query.city || 'none';
        let query = { status: 'Upcoming' };
        if (city !== 'none') {
            query.city = city;
        }

        const events = await Event.find(query).lean();
        const formattedEvents = events.map(row => ({
            id: row._id,
            name: row.event_name,
            description: row.about_event,
            date: new Date(row.date_time).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: new Date(row.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            location: row.venue,
            contact: row.contact_number,
            image: row.image || '/images/default_event.jpg'
        }));

        res.render('Events', { events: formattedEvents, user: req.session.user });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).send('Internal Server Error');
    }
});

// GET /event_booking_form - Render booking form
router.get('/event_booking_form', async (req, res) => {
    try {
        const eventId = req.query.eventId;
        if (!eventId) {
            return res.status(400).send('Event ID is required');
        }

        const event = await Event.findById(eventId).lean();
        if (!event) {
            return res.status(404).send('Event not found');
        }

        res.render('event_booking_form', {
            eventId,
            eventName: event.event_name,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).send('Server error');
    }
});

// POST /event_booking - Book an event
router.post('/event_booking', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please log in to book an event' });
    }

    try {
        const user = req.session.user;
        const {
            eventId,
            name,
            email,
            phone_number,
            address,
            seats,
            with_pet,
            pet_name,
            pet_breed,
            pet_dob
        } = req.body;

        if (!eventId || !name || !email || !phone_number || !address) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                missing: { eventId, name, email, phone_number, address }
            });
        }

        const attendee = await EventAttendee.create({
            event_id: eventId,
            user_id: user.id,
            name,
            phone_number,
            email,
            address,
            seats: seats || 1,
            with_pet: with_pet === 'yes',
            pet_name: pet_name || null,
            pet_breed: pet_breed || null,
            pet_dob: pet_dob ? new Date(pet_dob) : null
        });

        await Event.updateOne(
            { _id: eventId },
            { $inc: { tickets_sold: seats || 1 } }
        );

        res.json({ success: true, message: 'Ticket booked successfully' });
    } catch (error) {
        console.error('Error registering attendee:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
});

module.exports = router;