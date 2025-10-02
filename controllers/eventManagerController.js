const bcrypt = require('bcryptjs');
const { Event, EventAttendee, EventManager } = require('../models/database');
const mongoose = require("mongoose");

const eventManagerSignup = async (req, res) => {
    const { name, contactnumber, email, password, confirmpassword, companyname, location, termsandconditions } = req.body;

    if (!name || !contactnumber || !email || !password || !confirmpassword || !companyname || !location || termsandconditions === undefined) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (name.length < 2) {
        return res.status(400).json({ success: false, message: 'Validation failed' });
    }

    const phoneRejex = /^\d{10}$/.test(contactnumber);

    if (!phoneRejex) {
        return res.status(400).json({ success: false, message: 'Validation failed', });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Validation failed' });
    }

    if (password.length < 8 || !/\d/.test(password)) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long and contain a number' });
    }

    if (password !== confirmpassword) {
        return res.status(400).json({ success: false, message: 'Wrong PAssword' });
    }

    if (companyname.length < 2) {
        return res.status(400).json({ success: false, message: 'Validation failed', });
    }

    if (location.length < 3) {
        return res.status(400).json({ success: false, message: 'Validation failed' });
    }

    if (!termsandconditions) {
        return res.status(400).json({ success: false, message: 'Validation failed' });
    }

    try {

        const existingEventManager = await EventManager.findOne({ email });

        if (existingEventManager) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await EventManager.create({
            name,
            contact_number: contactnumber,
            email,
            password: hashedPassword,
            company_name: companyname,
            location
        });

        res.status(201).json({ success: true, redirect: '/service_provider_login', message: 'Event manager signup successful' });

    } catch (error) {
        console.error('Error in EventManager Signup controller', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const eventDashbord = async (req, res) => {
    try {

        const eventManagerId = req.session.eventManager.id;

        const overview = await Event.aggregate([
            { $match: { event_manager_id: new mongoose.Types.ObjectId(eventManagerId) } },
            {
                $group: {
                    _id: null,
                    totalEvents: { $sum: 1 },
                    totalBookings: { $sum: '$tickets_sold' },
                    totalEarnings: { $sum: { $multiply: ['$tickets_sold', '$ticket_price'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalEvents: { $ifNull: ['$totalEvents', 0] },
                    totalBookings: { $ifNull: ['$totalBookings', 0] },
                    totalEarnings: { $ifNull: ['$totalEarnings', 0] }
                }
            }
        ]);

        // Fetch ongoing events upto 3 events
        const ongoingEvents = await Event.find(
            { event_manager_id: new mongoose.Types.ObjectId(eventManagerId), status: 'Ongoing' },
            'id event_name tickets_sold ticket_price date_time image'
        ).limit(3).lean();

        // Fetch upcoming events (limit to 3)
        const upcomingEvents = await Event.find(
            { event_manager_id: new mongoose.Types.ObjectId(eventManagerId), status: 'Upcoming' },
            'id event_name tickets_sold ticket_price total_tickets date_time image'
        ).limit(3).lean();

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
                    event_date: '$event.date_time',
                    _id: 0
                }
            },
            { $limit: 3 }
        ]);

        res.render('eventmanager_dashboard', {
            overview: overview[0] || { totalEvents: 0, totalBookings: 0, totalEarnings: 0 },
            ongoingEvents,
            upcomingEvents,
            attendees,
            eventManager: req.session.eventManager
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Internal Server Error');
    }
}


// POST /eventmanager_dashboard/createEvent - Create a new event
// POST /eventmanager_dashboard/createEvent - Create a new event
const createNewEvent = async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;

        const {
            eventName, aboutEvent, language, duration, tickets, ageLimit,
            instructions, venue, terms, category, dateTime
        } = req.body;
        
        // Change this: Convert to Base64 instead of path (like in vendorController's submitProduct)
        let image = null;
        if (req.file) {
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            image = base64Image;
        }

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
            image  // Now stores Base64 string
        });

        res.status(200).json({ message: 'Event created successfully' });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Error creating event' });
    }
}
// PUT /eventmanager_dashboard/updateAttendee/:id - Update an attendees
const updateAttende = async (req, res) => {
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
}

// DELETE /eventmanager_dashboard/deleteAttendee/:id - Delete an attendee
const deleteAttendee = async (req, res) => {
    try {
        const attendeeId = req.params.id;

        await EventAttendee.deleteOne({ _id: attendeeId });

        res.status(200).json({ message: 'Attendee deleted successfully' });
    } catch (error) {
        console.error('Error deleting attendee:', error);
        res.status(500).json({ message: 'Error deleting attendee' });
    }
}
// get-events for dashbord
const getEvents = async (req, res) => {
    try {

        const eventManagerId = req.session.eventManager.id;
        const today = new Date();

        const previousEvents = await Event.aggregate([
            {
                $match: {
                    event_manager_id: new mongoose.Types.ObjectId(eventManagerId),
                    $or: [
                        { status: 'Past' },
                        { date_time: { $lt: today } }
                    ]
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
                    event_name: 1,
                    tickets_sold: 1,
                    ticket_price: 1,
                    date_time: 1,
                    total_tickets: 1,
                    image: 1,
                    status: 1,
                    venue: 1,
                    category: 1,
                    about_event: 1,
                    attendeeCount: { $size: '$attendees' },
                    totalSeats: { $sum: '$attendees.seats' }, // Sum of all seats
                    revenue: {
                        $multiply: [
                            { $sum: '$attendees.seats' }, // Sum seats first
                            '$ticket_price'
                        ]
                    },
                    time: {
                        $dateToString: {
                            format: '%H:%M', // Use 24-hour format to avoid %I issue
                            date: '$date_time'
                        }
                    },
                    formattedDate: {
                        $dateToString: {
                            format: '%B %d, %Y, %H:%M',
                            date: '$date_time'
                        }
                    },
                    _id: 0
                }
            }
        ]);

        const ongoingEvents = await Event.aggregate([
            {
                $match: {
                    event_manager_id: new mongoose.Types.ObjectId(eventManagerId),
                    status: 'Ongoing',
                    date_time: {
                        $gte: new Date(today.toISOString().split('T')[0]),
                        $lt: new Date(today.toISOString().split('T')[0] + 'T23:59:59.999Z')
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
                    event_name: 1,
                    tickets_sold: 1,
                    ticket_price: 1,
                    date_time: 1,
                    total_tickets: 1,
                    image: 1,
                    status: 1,
                    venue: 1,
                    category: 1,
                    about_event: 1,
                    attendeeCount: { $size: '$attendees' },
                    totalSeats: { $sum: '$attendees.seats' },
                    revenue: {
                        $multiply: [
                            { $sum: '$attendees.seats' },
                            '$ticket_price'
                        ]
                    },
                    time: {
                        $dateToString: {
                            format: '%H:%M',
                            date: '$date_time'
                        }
                    },
                    formattedDate: {
                        $dateToString: {
                            format: '%B %d, %Y, %H:%M',
                            date: '$date_time'
                        }
                    },
                    _id: 0
                }
            }
        ]);

        const upcomingEvents = await Event.aggregate([
            {
                $match: {
                    event_manager_id: new mongoose.Types.ObjectId(eventManagerId),
                    status: 'Upcoming',
                    date_time: { $gt: today }
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
                    event_name: 1,
                    tickets_sold: 1,
                    ticket_price: 1,
                    date_time: 1,
                    total_tickets: 1,
                    image: 1,
                    status: 1,
                    venue: 1,
                    category: 1,
                    about_event: 1,
                    attendeeCount: { $size: '$attendees' },
                    totalSeats: { $sum: '$attendees.seats' },
                    revenue: {
                        $multiply: [
                            { $sum: '$attendees.seats' },
                            '$ticket_price'
                        ]
                    },
                    time: {
                        $dateToString: {
                            format: '%H:%M',
                            date: '$date_time'
                        }
                    },
                    formattedDate: {
                        $dateToString: {
                            format: '%B %d, %Y, %H:%M',
                            date: '$date_time'
                        }
                    },
                    _id: 0
                }
            }
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
}
//get-event
const getEvent = async (req, res) => {
    try {
        const eventId = req.query.eventId;
        if (!eventId) {
            return res.status(400).send('Event ID is required');
        }

        const eventManagerId = req.session.eventManager.id;
        const event = await Event.findOne(
            { _id: eventId, event_manager_id: new mongoose.Types.ObjectId(eventManagerId) },
            'id event_name about_event language duration ticket_price age_limit instructions venue terms category date_time total_tickets'
        ).lean();

        if (!event) {
            return res.status(404).send('Event not found');
        }

        // Format the date and time for the form
        const dateTime = new Date(event.date_time);
        const formattedDate = dateTime.toISOString().split('T')[0]; // e.g., "2025-05-29"
        const formattedTime = dateTime.toTimeString().split(' ')[0].slice(0, 5); // e.g., "22:38"

        res.render('eventmanager_event_edit', {
            event: {
                id: event._id,
                event_name: event.event_name,
                about_event: event.about_event,
                language: event.language,
                duration: event.duration,
                ticket_price: event.ticket_price,
                age_limit: event.age_limit,
                instructions: event.instructions,
                venue: event.venue,
                terms: event.terms,
                category: event.category,
                total_tickets: event.total_tickets,
                formattedDate: formattedDate,
                time: formattedTime
            }
        });
    } catch (err) {
        console.error('Error fetching event for edit:', err);
        res.status(500).send('Internal Server Error');
    }
}
//@dec updateing  event 
//update event 
const updateEvent = async (req, res) => {
    try {
        const {
            eventId,
            eventName,
            eventDescription,
            language,
            duration,
            eventTicketPrice,
            ageLimit,
            instructions,
            eventVenue,
            terms,
            category,
            eventDate,
            eventTime,
            eventCapacity
        } = req.body;
        const eventManagerId = req.session.eventManager.id;

        const eventDateTime = new Date(`${eventDate} ${eventTime}:00`);
        await Event.updateOne(
            { _id: eventId, event_manager_id: new mongoose.Types.ObjectId(eventManagerId) },
            {
                event_name: eventName,
                about_event: eventDescription,
                language: language,
                duration: duration,
                ticket_price: parseFloat(eventTicketPrice),
                age_limit: parseInt(ageLimit),
                instructions: instructions,
                venue: eventVenue,
                terms: terms,
                category: category,
                date_time: eventDateTime,
                total_tickets: parseInt(eventCapacity)
            }
        );
        res.status(200).json({ message: "updated sucessufully" })
        res.redirect('/eventmanager_events');
    } catch (err) {
        console.error('Error updating event:', err);
        res.status(500).json({ success: false, message: 'Failed to update event' });
    }
}

const getAttendes = async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;
        const today = new Date();

        const pastOngoingAttendees = await EventAttendee.aggregate([
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
                    _id: '$event_id',
                    totalAttendees: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'event'
                }
            },
            { $unwind: '$event' },
            {
                $lookup: {
                    from: 'eventattendees',
                    localField: '_id',
                    foreignField: 'event_id',
                    as: 'attendees'
                }
            },
            { $unwind: { path: '$attendees', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    id: '$attendees._id',
                    name: '$attendees.name',
                    email: '$attendees.email',
                    registration_date: '$attendees.registration_date',
                    seats: '$attendees.seats',
                    event_id: '$event._id',
                    event_name: '$event.event_name',
                    date_time: '$event.date_time',
                    totalAttendees: 1,
                    eventTime: {
                        $dateToString: {
                            format: '%H:%M', // Use 24-hour format
                            date: '$event.date_time'
                        }
                    },
                    formattedDate: {
                        $dateToString: {
                            format: '%B %d, %Y',
                            date: '$event.date_time'
                        }
                    },
                    formattedRegDate: {
                        $dateToString: {
                            format: '%B %d, %Y',
                            date: '$attendees.registration_date'
                        }
                    },
                    _id: 0
                }
            },
            { $sort: { 'date_time': -1, 'id': 1 } }
        ]);

        const upcomingAttendees = await EventAttendee.aggregate([
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
                    eventTime: {
                        $dateToString: {
                            format: '%H:%M', // Use 24-hour format
                            date: '$event.date_time'
                        }
                    },
                    formattedDate: {
                        $dateToString: {
                            format: '%B %d, %Y',
                            date: '$event.date_time'
                        }
                    },
                    formattedRegDate: {
                        $dateToString: {
                            format: '%B %d, %Y',
                            date: '$registration_date'
                        }
                    },
                    _id: 0
                }
            },
            { $sort: { 'date_time': 1, 'id': 1 } }
        ]);

        res.render('eventmanager_attendees', {
            pastOngoingAttendees,
            upcomingAttendees
        });
    } catch (err) {
        console.error('Error fetching attendees:', err);
        res.status(500).send('Internal Server Error');
    }
}

const eventAnalytics = async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(today);
        startOfMonth.setDate(1);

        const revenueData = await Event.aggregate([
            {
                $match: {
                    event_manager_id: new mongoose.Types.ObjectId(eventManagerId)
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
                    ticket_price: 1,
                    date_time: 1,
                    totalSeats: { $sum: '$attendees.seats' }, // Sum seats for the event
                    totalRevenue: {
                        $multiply: [
                            { $sum: '$attendees.seats' },
                            '$ticket_price'
                        ]
                    },
                    todayRevenue: {
                        $cond: [
                            {
                                $eq: [
                                    { $dateToString: { format: '%Y-%m-%d', date: '$date_time' } },
                                    { $dateToString: { format: '%Y-%m-%d', date: today } }
                                ]
                            },
                            { $multiply: [{ $sum: '$attendees.seats' }, '$ticket_price'] },
                            0
                        ]
                    },
                    thisWeekRevenue: {
                        $cond: [
                            { $gte: ['$date_time', startOfWeek] },
                            { $multiply: [{ $sum: '$attendees.seats' }, '$ticket_price'] },
                            0
                        ]
                    },
                    thisMonthRevenue: {
                        $cond: [
                            { $gte: ['$date_time', startOfMonth] },
                            { $multiply: [{ $sum: '$attendees.seats' }, '$ticket_price'] },
                            0
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalRevenue' },
                    todayRevenue: { $sum: '$todayRevenue' },
                    thisWeekRevenue: { $sum: '$thisWeekRevenue' },
                    thisMonthRevenue: { $sum: '$thisMonthRevenue' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: { $ifNull: ['$totalRevenue', 0] },
                    todayRevenue: { $ifNull: ['$todayRevenue', 0] },
                    thisWeekRevenue: { $ifNull: ['$thisWeekRevenue', 0] },
                    thisMonthRevenue: { $ifNull: ['$thisMonthRevenue', 0] }
                }
            }
        ]);

        const attendeesData = await EventAttendee.aggregate([
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
                    'event.event_manager_id': new mongoose.Types.ObjectId(eventManagerId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalAttendees: { $addToSet: '$_id' },
                    todayAttendees: {
                        $addToSet: {
                            $cond: [
                                {
                                    $eq: [
                                        { $dateToString: { format: '%Y-%m-%d', date: '$registration_date' } },
                                        { $dateToString: { format: '%Y-%m-%d', date: today } }
                                    ]
                                },
                                '$_id',
                                null
                            ]
                        }
                    },
                    thisWeekAttendees: {
                        $addToSet: {
                            $cond: [
                                { $gte: ['$registration_date', startOfWeek] },
                                '$_id',
                                null
                            ]
                        }
                    },
                    thisMonthAttendees: {
                        $addToSet: {
                            $cond: [
                                { $gte: ['$registration_date', startOfMonth] },
                                '$_id',
                                null
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalAttendees: { $size: '$totalAttendees' },
                    todayAttendees: { $size: { $setDifference: ['$todayAttendees', [null]] } },
                    thisWeekAttendees: { $size: { $setDifference: ['$thisWeekAttendees', [null]] } },
                    thisMonthAttendees: { $size: { $setDifference: ['$thisMonthAttendees', [null]] } }
                }
            }
        ]);

        const avgTicketData = await Event.aggregate([
            {
                $match: {
                    event_manager_id: new mongoose.Types.ObjectId(eventManagerId),
                    ticket_price: { $gt: 0 }
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
                    avgTotal: '$ticket_price',
                    avgToday: {
                        $cond: [
                            {
                                $eq: [
                                    { $dateToString: { format: '%Y-%m-%d', date: '$date_time' } },
                                    { $dateToString: { format: '%Y-%m-%d', date: today } }
                                ]
                            },
                            '$ticket_price',
                            null
                        ]
                    },
                    avgThisWeek: {
                        $cond: [
                            { $gte: ['$date_time', startOfWeek] },
                            '$ticket_price',
                            null
                        ]
                    },
                    avgThisMonth: {
                        $cond: [
                            { $gte: ['$date_time', startOfMonth] },
                            '$ticket_price',
                            null
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgTotal: { $avg: '$avgTotal' },
                    avgToday: { $avg: '$avgToday' },
                    avgThisWeek: { $avg: '$avgThisWeek' },
                    avgThisMonth: { $avg: '$avgThisMonth' }
                }
            },
            {
                $project: {
                    _id: 0,
                    avgTotal: { $ifNull: ['$avgTotal', 0] },
                    avgToday: { $ifNull: ['$avgToday', 0] },
                    avgThisWeek: { $ifNull: ['$avgThisWeek', 0] },
                    avgThisMonth: { $ifNull: ['$avgThisMonth', 0] }
                }
            }
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
        res.status(500).send('Internal Server Error');
    }
};

const getEventManagerProfile = async (req, res) => {
    try {
        const eventManagerId = req.session.eventManager.id;

        const eventManager = await EventManager.findById(eventManagerId).lean();
        const eventsManaged = await Event.countDocuments({ event_manager_id: eventManagerId });

        if (!eventManager) {
            return res.status(404).render('error', { message: 'Event manager not found' });
        }

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
            license: eventManager.license,
            bio: eventManager.bio,
            eventsManaged,
            memberSince: 'January 15,2023',
            image: eventManager.image
        };
        res.render('eventmanager_profile', { profile });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).render('error', { message: 'Failed to load profile', error: err.message });
    }
}

const upadatePassword = async (req, res) => {
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
        await EventManager.updateOne(
            { _id: eventManagerId },
            { password: hashedPassword }
        );
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
}

//@dec data for Events.ejs 
//@route
//@access
const getEventsUser = async (req, res) => {
    try {
        const city = req.query.city || 'none';
        let query = { status: 'Upcoming' };
        if (city !== 'none') {
            query.city = city;
        }
        const events = await Event.find(query, 'id event_name about_event date_time venue contact_number image  ticket_price').lean();
        const formattedEvents = events.map(row => ({
            id: row._id,
            name: row.event_name,
            description: row.about_event,
            date: new Date(row.date_time).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: new Date(row.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            location: row.venue,
            contact: row.contact_number,
            price: row.ticket_price,
            image: row.image || '/images/default_event.jpg'
        }));
        res.render('Events', { events: formattedEvents, user: req.session.user });

    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).send('Internal Server Error');
    }
}

const registerEvent = async (req, res) => {
    try {
        const eventId = req.query.eventId;
        if (!eventId) {
            return res.status(400).send('Event ID is required');
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).send('Event not found');
        }

        const ticketsAvaliable = event.total_tickets - event.tickets_sold;

        res.render('event_booking_form', {
            eventId,
            eventName: event.event_name,
            ticketPrice: event.ticket_price,
            ticketsAvaliable,
            user: req.session.user
        });
    } catch (err) {
        console.error('Error fetching event:', err);
        res.status(500).send('Server error');
    }
}

const myEvents = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please log in to view your events' });
        }

        const userId = req.session.user.id;
        const today = new Date();

        const events = await EventAttendee.aggregate([
            {
                $match: { user_id: new mongoose.Types.ObjectId(userId) }
            },
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
                $project: {
                    event_id: '$event._id',
                    attendee_id: '$_id',
                    ticketId : '$ticketId',
                    event_name: '$event.event_name',
                    date_time: '$event.date_time',
                    venue: '$event.venue',
                    seats: '$seats',
                    image: '$event.image',
                    status: {
                        $cond: [
                            { $gt: ['$event.date_time', today] },
                            'Upcoming',
                            'Past'
                        ]
                    },
                    _id: 0
                }
            },
            { $sort: { 'date_time': -1 } }
        ]);

        res.json({ success: true, events });

    } catch (err) {
        console.error('Error fetching user events:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch events', error: err.message });
    }
}

const deleteTicket = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please log in to cancel a booking' });
        }

        const attendeeId = req.params.attendeeId;
        const userId = req.session.user.id;

        const attendee = await EventAttendee.findOne({ _id: attendeeId, user_id: userId });
        if (!attendee) {
            return res.status(404).json({ success: false, message: 'Booking not found or not authorized' });
        }

        const event = await Event.findById(attendee.event_id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Only allow cancellation for upcoming events
        if (new Date(event.date_time) <= new Date()) {
            return res.status(400).json({ success: false, message: 'Cannot cancel past or ongoing events' });
        }

        // Delete the attendee record
        await EventAttendee.deleteOne({ _id: attendeeId });

        // Decrease tickets_sold in the event
        await Event.updateOne(
            { _id: attendee.event_id },
            { $inc: { tickets_sold: -attendee.seats } }
        );

        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).json({ success: false, message: 'Failed to cancel booking', error: err.message });
    }
}

const postTicket = async (req, res) => {
    try {

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

        if (!eventId || !name || !email || !phone_number || !address) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                missing: { eventId, name, email, phone_number, address }
            });
        }

        function generateTicketId() {
            const prefix = "TKT"; // You can change this
            const timestamp = Date.now().toString(36).toUpperCase(); // Convert timestamp to base36
            const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase(); // Random string

            return `${prefix}-${timestamp}-${randomPart}`;
        }

        // Example usage:
        console.log(generateTicketId()); // Output: TKT-LS8QHI-9BZ3K

        const ticketId = generateTicketId();

        await EventAttendee.create({
            ticketId,
            event_id: eventId,
            user_id: user.id,
            name,
            phone_number,
            email,
            address,
            seats: seats || 1,
            with_pet: with_pet === 'yes' ? 1 : 0,
            pet_name: pet_name || null,
            pet_breed: pet_breed || null,
            pet_dob: pet_dob || null
        });

        await Event.updateOne(
            { _id: eventId },
            { $inc: { tickets_sold: seats || 1 } }
        );

        return res.redirect('/home');

    } catch (err) {
        console.error('Error booking event:', err);
        res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
}

const updateEventManagerProfile = async (req, res) => {
    try {
        console.log('Request Body:', req.body); // Log form data
        console.log('Uploaded File:', req.file); // Log file data
        const eventManagerId = req.session.eventManager.id;
        const { firstName, lastName, email, phone, eventType, license, bio } = req.body;
        const name = `${firstName} ${lastName}`.trim();
        const contact_number = phone ? phone.replace(/\D/g, '').slice(-10) : undefined;

        // Convert uploaded image to Base64
        let image = undefined;
        if (req.file) {
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            image = base64Image;
        }

        // Validate required fields
        if (!firstName || !lastName || !email || !phone || !eventType || !license || !bio) {
            console.error('Missing required fields:', { firstName, lastName, email, phone, eventType, license, bio });
            return res.render('eventmanager_profile', {
                profile: req.session.eventManager,
                error: 'All fields are required.'
            });
        }

        // Prepare update object
        const updateData = {
            name,
            email,
            contact_number,
            event_type: eventType,
            license,
            bio
        };

        // Only include image if a new file was uploaded
        if (image !== undefined) {
            updateData.image = image;
        }

        console.log('Update Data:', updateData); // Log data to be saved
        const updateResult = await EventManager.updateOne(
            { _id: eventManagerId },
            { $set: updateData }
        );

        console.log('Update Result:', updateResult); // Log update result

        // Update session data
        req.session.eventManager = {
            ...req.session.eventManager,
            name,
            email,
            contact_number,
            event_type: eventType,
            license,
            bio,
            image: image !== undefined ? image : req.session.eventManager.image // Keep old image if no new upload
        };

        res.redirect('/eventmanager_profile');
    } catch (err) {
        console.error('Error updating profile:', err);
        res.render('eventmanager_profile', {
            profile: req.session.eventManager,
            error: `Failed to update profile: ${err.message}`
        });
    }
};

const isAuthenticated = (req, res, next) => {
    if (req.session.eventManager) {
        next();
    } else {
        console.log('No eventManager session, redirecting to login');
        res.redirect('/service_provider_login');
    }
};

const getEventDetails = async (req, res) => {
    try {
        const eventId = req.query.eventId;
        if (!eventId) {
            return res.status(400).send("Event ID is required");
        }

        const eventData = await Event.findById(eventId).lean();
        if (!eventData) {
            return res.status(404).send("Event not found");
        }

        // Transform to match template expectations
        const event = {
            id: eventData._id,
            name: eventData.event_name,
            about: eventData.about_event,
            language: eventData.language,
            duration: eventData.duration,
            age_limit: eventData.age_limit,
            instructions: eventData.instructions,
            venue: eventData.venue,
            city: eventData.city,
            contact: eventData.contact_number,
            terms: eventData.terms,
            category: eventData.category,
            date: new Date(eventData.date_time).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: new Date(eventData.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            ticket_price: eventData.ticket_price,
            image: eventData.image || '/images/default_event.jpg'
        };

        res.render("eventDetails", {
            event,
            user: req.session.user
        });
    } catch (err) {
        console.error("Error fetching event details:", err);
        res.status(500).send("Internal Server Error");
    }
};

const editEvent = async(req,res) =>{
try {
        const eventId = req.query.eventId;

        if (!eventId) {
            return res.status(400).send("Event ID is required");
        }

        const eventData = await Event.findById(eventId).lean();
        if (!eventData) {
            return res.status(404).send("Event not found");
        }

        // Transform to match template expectations
        const event = {
            id: eventData._id,
            name: eventData.event_name,
            about: eventData.about_event,
            language: eventData.language,
            duration: eventData.duration,
            age_limit: eventData.age_limit,
            instructions: eventData.instructions,
            venue: eventData.venue,
            city: eventData.city,
            contact: eventData.contact_number,
            terms: eventData.terms,
            category: eventData.category,
            date: new Date(eventData.date_time).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: new Date(eventData.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            ticket_price: eventData.ticket_price,
            image: eventData.image || '/images/default_event.jpg'
        };

        res.render("eventmanager_event_edit", {
            event,
            user: req.session.user
        });
    } catch (err) {
        console.error("Error fetching event details:", err);
        res.status(500).send("Internal Server Error");
    }
    
}
module.exports = {
    eventManagerSignup, eventDashbord, createNewEvent, updateAttende, deleteAttendee, getEvents, getEvent, updateEvent
    , getAttendes, eventAnalytics, getEventManagerProfile, upadatePassword, getEventsUser, registerEvent, myEvents, deleteTicket,
    postTicket, updateEventManagerProfile, isAuthenticated, getEventDetails,editEvent
};

