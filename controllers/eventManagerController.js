const bcrypt = require('bcryptjs');
const { Event, EventAttendee, EventManager } = require('../models/database');
const mongoose = require("mongoose");
const { Console } = require('console');

const signup = async (req, res) => {
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

    if (password.length < 6 || !/\d/.test(password)) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long and contain a number' });
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

const getDashboard = async (req, res) => {
    try {
        if (!req.session.eventManager || !req.session.eventManager.id) {
            return res.redirect('/eventmanager/login');
        }

        const eventManagerId = new mongoose.Types.ObjectId(req.session.eventManager.id);
        const managedEventIds = await Event.find({ event_manager_id: eventManagerId }).distinct('_id');

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const promises = [
            // #################### FIX IS HERE ####################
            // 1. Get overview stats - The full pipeline must be inside the array
            Event.aggregate([
                { $match: { _id: { $in: managedEventIds } } },
                {
                    $lookup: {
                        from: 'eventattendees',
                        localField: '_id',
                        foreignField: 'event_id',
                        as: 'attendees'
                    }
                },
                {
                    $addFields: {
                        actualBookings: { $sum: '$attendees.seats' },
                        actualEarnings: { $multiply: [{ $sum: '$attendees.seats' }, '$ticket_price'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalEvents: { $sum: 1 },
                        totalBookings: { $sum: '$actualBookings' },
                        totalEarnings: { $sum: '$actualEarnings' }
                    }
                }
            ]),
            // ######################################################

            // 2. Get ongoing events
            Event.find({
                _id: { $in: managedEventIds },
                date_time: { $gte: startOfToday, $lte: endOfToday }
            }, 'event_name tickets_sold ticket_price date_time image')
                .sort({ date_time: 1 }).limit(3).lean(),

            // 3. Get upcoming events
            Event.find({
                _id: { $in: managedEventIds },
                date_time: { $gt: endOfToday }
            }, 'event_name tickets_sold ticket_price total_tickets date_time image')
                .sort({ date_time: 1 }).limit(3).lean(),

            // 4. Get previous events
            Event.find({
                _id: { $in: managedEventIds },
                date_time: { $lt: startOfToday }
            }, 'event_name tickets_sold ticket_price total_tickets date_time image')
                .sort({ date_time: -1 }).limit(3).lean(),

            // 5. Get recent attendees
            EventAttendee.find({ event_id: { $in: managedEventIds } })
                .sort({ registration_date: -1 })
                .limit(3)
                .populate('event_id', 'event_name date_time')
                .lean()
        ];

        const [
            overviewData,
            ongoingEvents,
            upcomingEvents,
            previousEvents,
            attendeesFromDB
        ] = await Promise.all(promises);

        const overview = overviewData[0] || { totalEvents: 0, totalBookings: 0, totalEarnings: 0 };

        const attendees = attendeesFromDB.map(att => ({
            _id: att._id.toString(),
            name: att.name,
            phone_number: att.phone_number,
            seats: att.seats,
            event_name: att.event_id ? att.event_id.event_name : 'N/A',
            event_date: att.event_id ? att.event_id.date_time : 'N/A'
        }));

        res.render('eventmanager_dashboard', {
            overview,
            ongoingEvents,
            upcomingEvents,
            previousEvents,
            attendees,
            eventManager: req.session.eventManager
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Internal Server Error');
    }
};

// POST /eventmanager_dashboard/createEvent - Create a new event
const createEvent = async (req, res) => {
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
const updateAttendee = async (req, res) => {
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

        // 1. Find the attendee document first to get details
        const attendee = await EventAttendee.findById(attendeeId);

        // If the attendee doesn't exist, send a 404 error
        if (!attendee) {
            return res.status(404).json({ message: 'Attendee not found' });
        }

        // 2. Update the event's tickets_sold count
        // Use the $inc operator to decrement the count by the number of seats
        // This is an atomic operation, which is safe and efficient
        await Event.findByIdAndUpdate(attendee.event_id, {
            $inc: { tickets_sold: -attendee.seats } 
        });

        // 3. Now, delete the attendee document
        await EventAttendee.deleteOne({ _id: attendeeId });

        res.status(200).json({ 
            message: `Successfully cancelled registration and returned ${attendee.seats} ticket(s) to the event.` 
        });

    } catch (error) {
        console.error('Error deleting attendee:', error);
        res.status(500).json({ message: 'Error deleting attendee' });
    }
};

// get-events for dashbord
const getManagerEvents = async (req, res) => {
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
const getEventForEdit = async (req, res) => {
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
// You will need to install and set up Multer for image uploads
// Example: const multer = require('multer');

const updateEvent = async (req, res) => {
    try {
        // These variable names now EXACTLY match the 'name' attributes in your form
        const {
            id,              // was eventId
            name,            // was eventName
            about,           // was eventDescription
            language,
            duration,
            ticket_price,    // was eventTicketPrice
            age_limit,       // was ageLimit
            instructions,
            venue,           // was eventVenue
            city,            // This was missing
            contact_number,  // This was missing and name was wrong
            terms,
            category,
            date,            // was eventDate
            time,            // was eventTime
            capacity,        // was eventCapacity (and was missing)
        } = req.body;

        const eventManagerId = req.session.eventManager.id;

        // Combine date and time correctly
        const eventDateTime = new Date(`${date}T${time}`);

        // Find the event first to get the existing image path if no new one is uploaded
        const eventToUpdate = await Event.findById(id);
        if (!eventToUpdate) {
            return res.status(404).send('Event not found.');
        }

        let image = undefined;
        if (req.file) {
            const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            image = base64Image;
        }
        // Only include image if a new file was uploaded
        await Event.updateOne(
            { _id: id, event_manager_id: new mongoose.Types.ObjectId(eventManagerId) },
            {
                event_name: name,
                about_event: about,
                language: language,
                duration: duration,
                ticket_price: parseFloat(ticket_price),
                age_limit: parseInt(age_limit),
                instructions: instructions,
                venue: venue,
                city: city, // Added city
                contact_number: contact_number, // Added contact_number
                terms: terms,
                category: category,
                date_time: eventDateTime,
                total_tickets: parseInt(capacity),
                image: image !== undefined ? image : undefined
            }
        );
        // 2. Redirect the user to the main events page
        res.status(200).json({message:"success"})
    } catch (err) {
        console.error('Error updating event:', err);
        // It's better to render an error page or send a clear error message
        res.status(500).send('Failed to update event.');
    }
};
const getAttendees = async (req, res) => {
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

const getAnalytics = async (req, res) => {
    try {
        if (!req.session?.eventManager?.id) {
            return res.status(401).send('Unauthorized: Please log in.');
        }
        const eventManagerId = new mongoose.Types.ObjectId(req.session.eventManager.id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // The server's timezone (ensure this matches your server's environment)
        const serverTimezone = "Asia/Kolkata";

        const [analyticsData] = await Event.aggregate([
            { $match: { event_manager_id: eventManagerId } },
            {
                $lookup: {
                    from: 'eventattendees',
                    localField: '_id',
                    foreignField: 'event_id',
                    as: 'attendees'
                }
            },
            // Unwind attendees *before* the facet to analyze each booking
            { $unwind: { path: '$attendees', preserveNullAndEmptyArrays: true } },
            {
                $facet: {
                    // This single facet now calculates everything based on individual bookings
                    mainAnalytics: [
                        {
                            $group: {
                                _id: null,
                                // --- REVENUE (based on registration_date) ---
                                totalRevenue: { $sum: { $multiply: ['$attendees.seats', '$ticket_price'] } },
                                todayRevenue: { $sum: { $cond: [{ $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$attendees.registration_date', timezone: serverTimezone } }, { $dateToString: { format: '%Y-%m-%d', date: today, timezone: serverTimezone } }] }, { $multiply: ['$attendees.seats', '$ticket_price'] }, 0] } },
                                thisWeekRevenue: { $sum: { $cond: [{ $gte: ['$attendees.registration_date', startOfWeek] }, { $multiply: ['$attendees.seats', '$ticket_price'] }, 0] } },
                                thisMonthRevenue: { $sum: { $cond: [{ $gte: ['$attendees.registration_date', startOfMonth] }, { $multiply: ['$attendees.seats', '$ticket_price'] }, 0] } },

                                // --- AVG TICKET PRICE (based on registration_date) ---
                                // Note: This is now the average price per booking/sale
                                avgTotal: { $avg: '$ticket_price' },
                                avgToday: { $avg: { $cond: [{ $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$attendees.registration_date', timezone: serverTimezone } }, { $dateToString: { format: '%Y-%m-%d', date: today, timezone: serverTimezone } }] }, '$ticket_price', null] } },
                                avgThisWeek: { $avg: { $cond: [{ $gte: ['$attendees.registration_date', startOfWeek] }, '$ticket_price', null] } },
                                avgThisMonth: { $avg: { $cond: [{ $gte: ['$attendees.registration_date', startOfMonth] }, '$ticket_price', null] } },

                                // --- ATTENDEES/SEATS (based on registration_date) ---
                                totalSeatsSold: { $sum: '$attendees.seats' },
                                todaySeatsSold: { $sum: { $cond: [{ $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$attendees.registration_date', timezone: serverTimezone } }, { $dateToString: { format: '%Y-%m-%d', date: today, timezone: serverTimezone } }] }, '$attendees.seats', 0] } },
                                thisWeekSeatsSold: { $sum: { $cond: [{ $gte: ['$attendees.registration_date', startOfWeek] }, '$attendees.seats', 0] } },
                                thisMonthSeatsSold: { $sum: { $cond: [{ $gte: ['$attendees.registration_date', startOfMonth] }, '$attendees.seats', 0] } }
                            }
                        }
                    ]
                }
            },
            // Project the final, combined results
            {
                $project: {
                    data: { $arrayElemAt: ['$mainAnalytics', 0] },
                }
            }
        ]);

        // Destructure from the single analytics object
        const data = analyticsData?.data || {};

        const revenue = {
            total: data.totalRevenue || 0,
            today: data.todayRevenue || 0,
            thisWeek: data.thisWeekRevenue || 0,
            thisMonth: data.thisMonthRevenue || 0,
            todayChange: data.todayRevenue ? 15 : 0,
            thisWeekChange: data.thisWeekRevenue ? 8 : 0,
            thisMonthChange: data.thisMonthRevenue ? 12 : 0
        };

        const attendees = {
            total: data.totalSeatsSold || 0,
            today: data.todaySeatsSold || 0,
            thisWeek: data.thisWeekSeatsSold || 0,
            thisMonth: data.thisMonthSeatsSold || 0,
            todayChange: data.todaySeatsSold ? 16 : 0,
            thisWeekChange: data.thisWeekSeatsSold ? 10 : 0,
            thisMonthChange: data.thisMonthSeatsSold ? 22 : 0
        };

        const avgTicketValue = {
            total: data.avgTotal || 0,
            today: data.avgToday || 0,
            thisWeek: data.avgThisWeek || 0,
            thisMonth: data.avgThisMonth || 0,
            todayChange: data.avgToday ? 7 : 0,
            thisWeekChange: data.avgThisWeek ? 3 : 0,
            thisMonthChange: data.avgThisMonth ? 1.5 : 0
        };

        res.render('eventmanager_analytics', { revenue, attendees, avgTicketValue });

    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).send('Internal Server Error');
    }
};
const getProfile = async (req, res) => {
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

const updatePassword = async (req, res) => {
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
const getPublicEvents = async (req, res) => {
    try {
        const city = req.query.city || 'none';
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set time to start of today
        let query = {
            status: 'Upcoming',
            date_time: { $gte: today } // Only events from today onwards
        };

        if (city !== 'none') {
            query.city = city;
        }

        const events = await Event.find(
            query,
            'id event_name about_event date_time venue contact_number image ticket_price'
        ).lean();

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
};


const showBookingForm = async (req, res) => {
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

const getUserEvents = async (req, res) => {
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
                    ticketId: '$ticketId',
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

        return res.redirect('/my_events');

    } catch (err) {
        console.error('Error booking event:', err);
        res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
    }
}

const updateProfile = async (req, res) => {
    try {

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
        const updateResult = await EventManager.updateOne(
            { _id: eventManagerId },
            { $set: updateData }
        );
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
        res.status(200).json({ success: true, message: 'Profile updated successfully!' });
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

const showEditForm = async(req,res) =>{
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
            total_tickets: eventData.total_tickets,
            date: new Date(eventData.date_time).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: new Date(eventData.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            ticket_price: eventData.ticket_price,
            tickets_sold:eventData.tickets_sold,
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

const getEventDetail = async (req, res) => {
    try {

        const eventId = req.params.id;
        // 2. ADD THIS VALIDATION BLOCK
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            // If the ID is not in a valid format, send a 400 error immediately
            return res.status(400).render('error', { message: 'Invalid event ID format.' });
        }

        // Fetch the event and its attendees from the database at the same time
        const [event, attendees] = await Promise.all([
            Event.findById(eventId),
            EventAttendee.find({ event_id: eventId }) // Find all attendees for this specific event
        ]);

        // If the event doesn't exist, show an error
        if (!event) {
            return res.status(404).render('error', { message: 'Event not found.' });
        }

        // Calculate the revenue for this event
        const revenue = event.tickets_sold * event.ticket_price;

        // Render the new 'event-details.ejs' page and pass all the data to it
        res.render('event-details', {
            title: event.event_name,
            event: event,
            attendees: attendees,
            revenue: revenue
        });

    } catch (error) {
        console.error('Error fetching event details:', error);
        res.status(500).render('error', { message: 'A server error occurred.' });
    }
}


const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        // 2. Find the event to ensure it exists before proceeding
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found.' });
        }

        // 3. Delete all attendees associated with this event to maintain data integrity
        await EventAttendee.deleteMany({ event_id: id });

        // 4. Delete the event itself
        await Event.findByIdAndDelete(id);

        // 5. Send a success response
        res.status(200).json({ 
            success: true, 
            message: 'Event and all associated attendees deleted successfully.' 
        });

    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error' 
        });
    }
};

module.exports = {
    signup, getDashboard, createEvent, updateAttendee, deleteAttendee, getManagerEvents, getEventForEdit, updateEvent
    , getAttendees, getAnalytics, getProfile, updatePassword, getPublicEvents, showBookingForm, getUserEvents, deleteTicket,
    postTicket, updateProfile, isAuthenticated, getEventDetails,showEditForm, getEventDetail,deleteEvent
};

