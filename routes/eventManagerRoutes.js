const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const { Event, EventAttendee, EventManager, User } = require('../models/database');
const { eventManagerSignup } = require('../controllers/eventManagerController');

// Route for event manager signup (existing)
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

// Dashboard route
router.get('/eventmanager_dashboard', isAuthenticated, async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;

        // Fetch overview metrics
        const overview = await Event.aggregate([
            { $match: { event_manager_id: mongoose.Types.ObjectId(eventManagerId) } },
            {
                $group: {
                    _id: null,
                    totalEvents: { $sum: 1 },
                    totalBookings: { $sum: '$tickets_sold' },
                    totalEarnings: { $sum: { $multiply: ['$tickets_sold', '$ticket_price'] } }
                }
            }
        ]);

        // Fetch ongoing events (limit to 3)
        const ongoingEvents = await Event.find({
            event_manager_id: eventManagerId,
            status: 'Ongoing'
        })
            .select('name tickets_sold ticket_price date image')
            .limit(3)
            .lean();

        // Fetch upcoming events (limit to 3)
        const upcomingEvents = await Event.find({
            event_manager_id: eventManagerId,
            status: 'Upcoming'
        })
            .select('name tickets_sold ticket_price total_tickets date image')
            .limit(3)
            .lean();

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
            { $match: { 'event.event_manager_id': mongoose.Types.ObjectId(eventManagerId) } },
            { $limit: 3 },
            {
                $project: {
                    id: '$_id',
                    name: 1,
                    phone_number: 1,
                    seats: 1,
                    event_name: { $arrayElemAt: ['$event.name', 0] },
                    event_date: { $arrayElemAt: ['$event.date', 0] }
                }
            }
        ]);

        res.render('eventmanager_dashboard', {
            overview: overview[0] || { totalEvents: 0, totalBookings: 0, totalEarnings: 0 },
            ongoingEvents: ongoingEvents.map(event => ({
                ...event,
                id: event._id
            })),
            upcomingEvents: upcomingEvents.map(event => ({
                ...event,
                id: event._id
            })),
            attendees,
            eventManager: req.session.eventManager
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Create a new event
router.post('/eventmanager_dashboard/create-event', isAuthenticated, upload.single('eventPhoto'), async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;
        const {
            eventName, aboutEvent, language, duration, tickets, ageLimit,
            instructions, venue, terms, category, dateTime
        } = req.body;
        const image = req.file ? `/images/${req.file.filename}` : null;

        const event = new Event({
            event_manager_id: eventManagerId,
            name: eventName,
            description: aboutEvent,
            language,
            duration,
            ticket_price: parseFloat(tickets),
            age_limit: parseInt(ageLimit),
            instructions,
            venue,
            terms,
            category,
            date: new Date(dateTime),
            status: 'Upcoming',
            city: 'Hyderabad',
            phone: '1234567890',
            image
        });
        await event.save();

        res.status(200).json({ message: 'Event created successfully' });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Error creating event' });
    }
});

// Update an attendee
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

// Delete an attendee
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

// Fetch events for the dashboard
router.get('/eventmanager_events', isAuthenticated, async (req, res) => {
    const eventManagerId = req.session.eventManager.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const [previousEvents, ongoingEvents, upcomingEvents] = await Promise.all([
            Event.aggregate([
                {
                    $match: {
                        event_manager_id: mongoose.Types.ObjectId(eventManagerId),
                        $or: [{ status: 'Past' }, { date: { $lt: today } }]
                    }
                },
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
                        event_name: '$name',
                        tickets_sold: 1,
                        ticket_price: 1,
                        date_time: '$date',
                        image: 1,
                        total_tickets: 1,
                        attendeeCount: { $size: '$attendees' },
                        revenue: { $sum: { $multiply: ['$ticket_price', '$attendees.seats'] } },
                        time: {
                            $dateToString: { format: '%I:%M %p', date: '$date' }
                        },
                        formattedDate: {
                            $dateToString: { format: '%B %d, %Y, %I:%M %p', date: '$date' }
                        }
                    }
                }
            ]),
            Event.aggregate([
                {
                    $match: {
                        event_manager_id: mongoose.Types.ObjectId(eventManagerId),
                        status: 'Ongoing',
                        date: {
                            $gte: today,
                            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                        }
                    }
                },
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
                        event_name: '$name',
                        tickets_sold: 1,
                        ticket_price: 1,
                        date_time: '$date',
                        image: 1,
                        total_tickets: 1,
                        attendeeCount: { $size: '$attendees' },
                        revenue: { $sum: { $multiply: ['$ticket_price', '$attendees.seats'] } },
                        time: {
                            $dateToString: { format: '%I:%M %p', date: '$date' }
                        },
                        formattedDate: {
                            $dateToString: { format: '%B %d, %Y, %I:%M %p', date: '$date' }
                        }
                    }
                }
            ]),
            Event.aggregate([
                {
                    $match: {
                        event_manager_id: mongoose.Types.ObjectId(eventManagerId),
                        status: 'Upcoming',
                        date: { $gt: today }
                    }
                },
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
                        event_name: '$name',
                        tickets_sold: 1,
                        ticket_price: 1,
                        date_time: '$date',
                        image: 1,
                        total_tickets: 1,
                        attendeeCount: { $size: '$attendees' },
                        revenue: { $sum: { $multiply: ['$ticket_price', '$attendees.seats'] } },
                        time: {
                            $dateToString: { format: '%I:%M %p', date: '$date' }
                        },
                        formattedDate: {
                            $dateToString: { format: '%B %d, %Y, %I:%M %p', date: '$date' }
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
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Update event
router.post('/eventmanager_events/update', isAuthenticated, async (req, res) => {
    const { eventId, eventName, eventDate, eventTime, eventVenue, eventCapacity, eventTicketPrice, eventDescription } = req.body;
    const eventManagerId = req.session.eventManager.id;

    try {
        const eventDateTime = new Date(`${eventDate} ${eventTime}`);
        await Event.updateOne(
            { _id: eventId, event_manager_id: eventManagerId },
            {
                name: eventName,
                date: eventDateTime,
                venue: eventVenue,
                total_tickets: parseInt(eventCapacity),
                ticket_price: parseFloat(eventTicketPrice),
                description: eventDescription
            }
        );

        res.redirect('/eventmanager_events');
    } catch (err) {
        console.error('Error updating event:', err);
        res.status(500).json({ success: false, message: 'Failed to update event' });
    }
});

// Fetch attendees
router.get('/eventmanager_attendees', isAuthenticated, async (req, res) => {
    const eventManagerId = req.session.eventManager.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    try {
        const [pastOngoingAttendees, upcomingAttendees] = await Promise.all([
            EventAttendee.aggregate([
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event_id',
                        foreignField: '_id',
                        as: 'event'
                    }
                },
                {
                    $match: {
                        'event.event_manager_id': mongoose.Types.ObjectId(eventManagerId),
                        $or: [
                            { 'event.status': { $in: ['Past', 'Ongoing'] } },
                            { 'event.date': { $lte: today } }
                        ]
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
                        event_name: { $arrayElemAt: ['$event.name', 0] },
                        date_time: { $arrayElemAt: ['$event.date', 0] },
                        totalAttendees: {
                            $size: {
                                $filter: {
                                    input: '$event.attendees',
                                    as: 'attendee',
                                    cond: { $eq: ['$$attendee.event_id', '$event._id'] }
                                }
                            }
                        }
                    }
                },
                { $sort: { date_time: -1, id: 1 } }
            ]).then(rows => rows.map(row => ({
                ...row,
                eventTime: formatTime(row.date_time),
                formattedDate: formatDate(row.date_time),
                formattedRegDate: formatDate(row.registration_date)
            }))),
            EventAttendee.aggregate([
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event_id',
                        foreignField: '_id',
                        as: 'event'
                    }
                },
                {
                    $match: {
                        'event.event_manager_id': mongoose.Types.ObjectId(eventManagerId),
                        'event.status': 'Upcoming',
                        'event.date': { $gt: today }
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
                        event_name: { $arrayElemAt: ['$event.name', 0] },
                        date_time: { $arrayElemAt: ['$event.date', 0] }
                    }
                },
                { $sort: { date_time: 1, id: 1 } }
            ]).then(rows => rows.map(row => ({
                ...row,
                eventTime: formatTime(row.date_time),
                formattedDate: formatDate(row.date_time),
                formattedRegDate: formatDate(row.registration_date)
            })))
        ]);

        res.render('eventmanager_attendees', {
            pastOngoingAttendees,
            upcomingAttendees
        });
    } catch (err) {
        console.error('Error fetching attendees:', err);
        res.status(500).render('error', {
            message: 'Failed to load attendees. Please try again later.',
            error: err.message
        });
    }
});

// Analytics route
router.get('/eventmanager_analytics', isAuthenticated, async (req, res) => {
    const eventManagerId = req.session.eventManager.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today);
    startOfMonth.setDate(1);

    try {
        const [revenueData, attendeesData, avgTicketData] = await Promise.all([
            EventAttendee.aggregate([
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event_id',
                        foreignField: '_id',
                        as: 'event'
                    }
                },
                { $match: { 'event.event_manager_id': mongoose.Types.ObjectId(eventManagerId) } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $multiply: [{ $arrayElemAt: ['$event.ticket_price', 0] }, '$seats'] } },
                        todayRevenue: {
                            $sum: {
                                $cond: [
                                    { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: { $arrayElemAt: ['$event.date', 0] } } }, { $dateToString: { format: '%Y-%m-%d', date: today } }] },
                                    { $multiply: [{ $arrayElemAt: ['$event.ticket_price', 0] }, '$seats'] },
                                    0
                                ]
                            }
                        },
                        thisWeekRevenue: {
                            $sum: {
                                $cond: [
                                    { $gte: [{ $arrayElemAt: ['$event.date', 0] }, startOfWeek] },
                                    { $multiply: [{ $arrayElemAt: ['$event.ticket_price', 0] }, '$seats'] },
                                    0
                                ]
                            }
                        },
                        thisMonthRevenue: {
                            $sum: {
                                $cond: [
                                    { $gte: [{ $arrayElemAt: ['$event.date', 0] }, startOfMonth] },
                                    { $multiply: [{ $arrayElemAt: ['$event.ticket_price', 0] }, '$seats'] },
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            EventAttendee.aggregate([
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event_id',
                        foreignField: '_id',
                        as: 'event'
                    }
                },
                { $match: { 'event.event_manager_id': mongoose.Types.ObjectId(eventManagerId) } },
                {
                    $group: {
                        _id: null,
                        totalAttendees: { $sum: 1 },
                        todayAttendees: {
                            $sum: {
                                $cond: [
                                    { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$registration_date' } }, { $dateToString: { format: '%Y-%m-%d', date: today } }] },
                                    1,
                                    0
                                ]
                            }
                        },
                        thisWeekAttendees: {
                            $sum: {
                                $cond: [
                                    { $gte: ['$registration_date', startOfWeek] },
                                    1,
                                    0
                                ]
                            }
                        },
                        thisMonthAttendees: {
                            $sum: {
                                $cond: [
                                    { $gte: ['$registration_date', startOfMonth] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            Event.aggregate([
                { $match: { event_manager_id: mongoose.Types.ObjectId(eventManagerId), ticket_price: { $gt: 0 } } },
                {
                    $group: {
                        _id: null,
                        avgTotal: { $avg: '$ticket_price' },
                        avgToday: {
                            $avg: {
                                $cond: [
                                    { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$date' } }, { $dateToString: { format: '%Y-%m-%d', date: today } }] },
                                    '$ticket_price',
                                    null
                                ]
                            }
                        },
                        avgThisWeek: {
                            $avg: {
                                $cond: [
                                    { $gte: ['$date', startOfWeek] },
                                    '$ticket_price',
                                    null
                                ]
                            }
                        },
                        avgThisMonth: {
                            $avg: {
                                $cond: [
                                    { $gte: ['$date', startOfMonth] },
                                    '$ticket_price',
                                    null
                                ]
                            }
                        }
                    }
                }
            ])
        ]);

        const revenue = {
            total: revenueData[0]?.totalRevenue || 0,
            today: revenueData[0]?.todayRevenue || 0,
            thisWeek: revenueData[0]?.thisWeekRevenue || 0,
            thisMonth: revenueData[0]?.thisMonthRevenue || 0,
            todayChange: revenueData[0]?.todayRevenue ? 15 : 0,
            thisWeekChange: revenueData[0]?.thisWeekRevenue ? 8 : 0,
            thisMonthChange: revenueData[0]?.thisMonthRevenue ? 12 : 0
        };

        const attendees = {
            total: attendeesData[0]?.totalAttendees || 0,
            today: attendeesData[0]?.todayAttendees || 0,
            thisWeek: attendeesData[0]?.thisWeekAttendees || 0,
            thisMonth: attendeesData[0]?.thisMonthAttendees || 0,
            todayChange: attendeesData[0]?.todayAttendees ? 16 : 0,
            thisWeekChange: attendeesData[0]?.thisWeekAttendees ? 10 : 0,
            thisMonthChange: attendeesData[0]?.thisMonthAttendees ? 22 : 0
        };

        const avgTicketValue = {
            total: avgTicketData[0]?.avgTotal || 0,
            today: avgTicketData[0]?.avgToday || 0,
            thisWeek: avgTicketData[0]?.avgThisWeek || 0,
            thisMonth: avgTicketData[0]?.avgThisMonth || 0,
            todayChange: avgTicketData[0]?.avgToday ? 7 : 0,
            thisWeekChange: avgTicketData[0]?.avgThisWeek ? 3 : 0,
            thisMonthChange: avgTicketData[0]?.avgThisMonth ? 1.5 : 0
        };

        res.render('eventmanager_analytics', {
            revenue,
            attendees,
            avgTicketValue
        });
    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).render('error', {
            message: 'Failed to load analytics. Please try again later.',
            error: err.message
        });
    }
});

// Profile page
router.get('/eventmanager_profile', isAuthenticated, async (req, res) => {
    const eventManagerId = req.session.eventManager.id;

    try {
        const eventManager = await EventManager.findById(eventManagerId).select('name email phone company_name location');
        const eventsManaged = await Event.countDocuments({ event_manager_id: eventManagerId });

        if (!eventManager) {
            return res.status(404).render('error', { message: 'Event manager not found' });
        }

        const [firstName, ...lastNameParts] = eventManager.name.split(' ');
        const lastName = lastNameParts.join(' ');
        const phoneRaw = eventManager.phone;
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
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).render('error', { message: 'Failed to load profile', error: err.message });
    }
});

// Update profile
router.post('/eventmanager_profile', isAuthenticated, upload.single('profilePic'), async (req, res) => {
    const eventManagerId = req.session.eventManager.id;
    const { firstName, lastName, email, phone, eventType, license, bio } = req.body;
    const name = `${firstName} ${lastName}`.trim();
    const contact_number = phone.replace(/\D/g, '').slice(-10);

    try {
        await EventManager.updateOne(
            { _id: eventManagerId },
            { name, email, phone: contact_number }
        );

        res.redirect('/eventmanager_profile');
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Update password
router.post('/eventmanager_profile/password', isAuthenticated, async (req, res) => {
    const eventManagerId = req.session.eventManager.id;
    const { currentPassword, newPassword } = req.body;

    try {
        const eventManager = await EventManager.findById(eventManagerId).select('password');
        if (!eventManager) {
            return res.status(404).json({ success: false, message: 'Event manager not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, eventManager.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await EventManager.updateOne(
            { _id: eventManagerId },
            { password: hashedPassword }
        );

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
});

// Fetch public events
router.get('/Events', async (req, res) => {
    const city = req.query.city || 'none';

    try {
        const query = { status: 'Upcoming' };
        if (city !== 'none') {
            query.city = city;
        }

        const events = await Event.find(query).select('name description date venue phone image').lean();

        res.render('Events', {
            events: events.map(event => ({
                id: event._id,
                name: event.name,
                description: event.description,
                date: new Date(event.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
                time: new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                location: event.venue,
                contact: event.phone,
                image: event.image || '/images/default_event.jpg'
            })),
            user: req.session.user
        });
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Event booking form
router.get('/event_booking_form', async (req, res) => {
    const eventId = req.query.eventId;
    if (!eventId) {
        return res.status(400).send('Event ID is required');
    }

    try {
        const event = await Event.findById(eventId).select('name');
        if (!event) {
            return res.status(404).send('Event not found');
        }
        res.render('event_booking_form', {
            eventId,
            eventName: event.name,
            user: req.session.user
        });
    } catch (err) {
        console.error('Error fetching event:', err);
        res.status(500).send('Server error');
    }
});

// Event booking
router.post('/event_booking', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please log in to book an event' });
    }

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

    console.log('Booking request:', {
        eventId,
        user_id: user.id,
        name,
        email,
        phone_number,
        address,
        seats,
        with_pet,
        pet_name,
        pet_breed,
        pet_dob
    });

    if (!eventId || !name || !email || !phone_number || !address) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields',
            missing: { eventId, name, email, phone_number, address }
        });
    }

    try {
        const attendee = new EventAttendee({
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
            pet_dob: pet_dob || null
        });
        await attendee.save();

        await Event.updateOne(
            { _id: eventId },
            { $inc: { tickets_sold: seats || 1 } }
        );

        res.json({ success: true, message: 'Ticket booked successfully' });
    } catch (err) {
        console.error('Error registering attendee:', err);
        res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
});

module.exports = router;