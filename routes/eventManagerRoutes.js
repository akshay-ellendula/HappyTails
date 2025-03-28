// routes/eventManagerRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { db } = require('../models/database');
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
    if (req.session.eventManagerId) {
        next();
    } else {
        res.redirect('/service_provider_login');
    }
};

router.get('/eventmanager_dashboard', isAuthenticated, async (req, res) => {
    try {
        const eventManagerId = req.session.eventManagerId;
        console.log('Event Manager ID:', eventManagerId); // Debug log

        // Fetch overview metrics
        const overviewQuery = `
            SELECT 
                COUNT(*) as totalEvents,
                SUM(tickets_sold) as totalBookings,
                SUM(tickets_sold * ticket_price) as totalEarnings
            FROM events
            WHERE event_manager_id = ?;
        `;
        const overview = await new Promise((resolve, reject) => {
            db.get(overviewQuery, [eventManagerId], (err, row) => {
                if (err) {
                    console.error('Error fetching overview:', err); // Debug log
                    reject(err);
                }
                console.log('Overview Query Result:', row); // Debug log
                resolve(row || { totalEvents: 0, totalBookings: 0, totalEarnings: 0 });
            });
        });

        // Fetch ongoing events (limit to 3)
        const ongoingEventsQuery = `
            SELECT id, event_name, tickets_sold, ticket_price, date_time, image
            FROM events
            WHERE event_manager_id = ? AND status = 'Ongoing'
            LIMIT 3;
        `;
        const ongoingEvents = await new Promise((resolve, reject) => {
            db.all(ongoingEventsQuery, [eventManagerId], (err, rows) => {
                if (err) {
                    console.error('Error fetching ongoing events:', err); // Debug log
                    reject(err);
                }
                console.log('Ongoing Events:', rows); // Debug log
                resolve(rows || []);
            });
        });

        // Fetch upcoming events (limit to 3)
        const upcomingEventsQuery = `
            SELECT id, event_name, tickets_sold, ticket_price, total_tickets, date_time, image
            FROM events
            WHERE event_manager_id = ? AND status = 'Upcoming'
            LIMIT 3;
        `;
        const upcomingEvents = await new Promise((resolve, reject) => {
            db.all(upcomingEventsQuery, [eventManagerId], (err, rows) => {
                if (err) {
                    console.error('Error fetching upcoming events:', err); // Debug log
                    reject(err);
                }
                console.log('Upcoming Events:', rows); // Debug log
                resolve(rows || []);
            });
        });

        // Fetch attendees (limit to 3)
        const attendeesQuery = `
            SELECT ea.id, ea.name, ea.phone_number, ea.seats, e.event_name, e.date_time as event_date
            FROM event_attendees ea
            JOIN events e ON ea.event_id = e.id
            WHERE e.event_manager_id = ?
            LIMIT 3;
        `;
        const attendees = await new Promise((resolve, reject) => {
            db.all(attendeesQuery, [eventManagerId], (err, rows) => {
                if (err) {
                    console.error('Error fetching attendees:', err); // Debug log
                    reject(err);
                }
                console.log('Attendees:', rows); // Debug log
                resolve(rows || []);
            });
        });

        console.log('Rendering with data:', { overview, ongoingEvents, upcomingEvents, attendees }); // Debug log
        res.render('eventmanager_dashboard', {
            overview,
            ongoingEvents,
            upcomingEvents,
            attendees
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST /eventmanager_dashboard/create-event - Create a new event
router.post('/eventmanager_dashboard/create-event', isAuthenticated, upload.single('eventPhoto'), async (req, res) => {
    try {
        const eventManagerId = req.session.eventManagerId;
        const {
            eventName, aboutEvent, language, duration, tickets, ageLimit,
            instructions, venue, terms, category, dateTime
        } = req.body;
        const image = req.file ? `/images/${req.file.filename}` : null;

        const insertQuery = `
            INSERT INTO events (event_manager_id, event_name, about_event, language, duration, ticket_price, age_limit, instructions, venue, terms, category, date_time, status, city, contact_number, image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        await new Promise((resolve, reject) => {
            db.run(insertQuery, [
                eventManagerId, eventName, aboutEvent, language, duration, parseFloat(tickets), parseInt(ageLimit),
                instructions, venue, terms, category, dateTime, 'Upcoming', 'Hyderabad', '1234567890', image
            ], function (err) {
                if (err) reject(err);
                resolve();
            });
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

        const updateQuery = `
            UPDATE event_attendees
            SET name = ?, phone_number = ?, seats = ?
            WHERE id = ?;
        `;
        await new Promise((resolve, reject) => {
            db.run(updateQuery, [name, phone_number, parseInt(seats), attendeeId], function (err) {
                if (err) reject(err);
                resolve();
            });
        });

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

        const deleteQuery = `
            DELETE FROM event_attendees
            WHERE id = ?;
        `;
        await new Promise((resolve, reject) => {
            db.run(deleteQuery, [attendeeId], function (err) {
                if (err) reject(err);
                resolve();
            });
        });

        res.status(200).json({ message: 'Attendee deleted successfully' });
    } catch (error) {
        console.error('Error deleting attendee:', error);
        res.status(500).json({ message: 'Error deleting attendee' });
    }
});
// Fetch events for the dashboard
router.get('/eventmanager_events', isAuthenticated, (req, res) => {
    const eventManagerId = req.session.eventManagerId;
    const today = new Date().toISOString().split('T')[0]; // '2025-03-27'

    // Fetch previous events
    const previousEventsQuery = `
        SELECT e.*, 
               COUNT(ea.id) as attendeeCount, 
               SUM(e.ticket_price * ea.seats) as revenue,
               strftime('%I:%M %p', e.date_time) as time,
               strftime('%B %d, %Y, %I:%M %p', e.date_time) as formattedDate
        FROM events e
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.event_manager_id = ? AND (e.status = 'Past' OR e.date_time < ?)
        GROUP BY e.id
    `;

    // Fetch ongoing events
    const ongoingEventsQuery = `
        SELECT e.*, 
               COUNT(ea.id) as attendeeCount, 
               SUM(e.ticket_price * ea.seats) as revenue,
               strftime('%I:%M %p', e.date_time) as time,
               strftime('%B %d, %Y, %I:%M %p', e.date_time) as formattedDate
        FROM events e
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.event_manager_id = ? AND e.status = 'Ongoing' AND e.date_time LIKE ?
        GROUP BY e.id
    `;

    // Fetch upcoming events
    const upcomingEventsQuery = `
        SELECT e.*, 
               COUNT(ea.id) as attendeeCount, 
               SUM(e.ticket_price * ea.seats) as revenue,
               strftime('%I:%M %p', e.date_time) as time,
               strftime('%B %d, %Y, %I:%M %p', e.date_time) as formattedDate
        FROM events e
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.event_manager_id = ? AND e.status = 'Upcoming' AND e.date_time > ?
        GROUP BY e.id
    `;

    Promise.all([
        new Promise((resolve, reject) => {
            db.all(previousEventsQuery, [eventManagerId, today], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(ongoingEventsQuery, [eventManagerId, `${today}%`], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(upcomingEventsQuery, [eventManagerId, today], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        })
    ])
    .then(([previousEvents, ongoingEvents, upcomingEvents]) => {
        console.log('Rendering events:', { previousEvents, ongoingEvents, upcomingEvents });
        res.render('eventmanager_events', {
            previousEvents,
            ongoingEvents,
            upcomingEvents
        });
    })
    .catch(err => {
        console.error('Error fetching events:', err);
        res.status(500).send('Internal Server Error');
    });
});

// Update event
router.post('/eventmanager_events/update', isAuthenticated, (req, res) => {
    const { eventId, eventName, eventDate, eventTime, eventVenue, eventCapacity, eventTicketPrice, eventDescription } = req.body;
    const eventManagerId = req.session.eventManagerId;

    const eventDateTime = `${eventDate} ${eventTime}:00`; // Combine date and time
    const updateQuery = `
        UPDATE events
        SET event_name = ?, date_time = ?, venue = ?, total_tickets = ?, ticket_price = ?, about_event = ?
        WHERE id = ? AND event_manager_id = ?
    `;

    db.run(updateQuery, [eventName, eventDateTime, eventVenue, eventCapacity, eventTicketPrice, eventDescription, eventId, eventManagerId], (err) => {
        if (err) {
            console.error('Error updating event:', err);
            return res.status(500).json({ success: false, message: 'Failed to update event' });
        }
        res.redirect('/eventmanager_events');
    });
});

router.get('/eventmanager_attendees', isAuthenticated, (req, res) => {
    const eventManagerId = req.session.eventManagerId;
    const today = new Date().toISOString().split('T')[0]; // '2025-03-27'

    // Fetch past and ongoing attendees
    const pastOngoingAttendeesQuery = `
        SELECT ea.id, ea.name, ea.email, ea.registration_date, ea.seats,
               e.id as event_id, e.event_name, e.date_time,
               (SELECT COUNT(*) FROM event_attendees ea2 WHERE ea2.event_id = e.id) as totalAttendees
        FROM events e
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.event_manager_id = ? 
          AND (e.status IN ('Past', 'Ongoing') OR e.date_time <= ?)
        ORDER BY e.date_time DESC, ea.id
    `;

    // Fetch upcoming attendees
    const upcomingAttendeesQuery = `
        SELECT ea.id, ea.name, ea.email, ea.registration_date, ea.seats,
               e.id as event_id, e.event_name, e.date_time
        FROM events e
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.event_manager_id = ? 
          AND e.status = 'Upcoming' 
          AND e.date_time > ?
        ORDER BY e.date_time ASC, ea.id
    `;

    // Helper function to format dates
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    Promise.all([
        new Promise((resolve, reject) => {
            db.all(pastOngoingAttendeesQuery, [eventManagerId, today], (err, rows) => {
                if (err) {
                    reject(new Error(`Past/Ongoing Query Error: ${err.message}`));
                } else {
                    // Format dates and times
                    const formattedRows = rows.map(row => ({
                        ...row,
                        eventTime: formatTime(row.date_time),
                        formattedDate: formatDate(row.date_time),
                        formattedRegDate: formatDate(row.registration_date)
                    }));
                    resolve(formattedRows || []);
                }
            });
        }),
        new Promise((resolve, reject) => {
            db.all(upcomingAttendeesQuery, [eventManagerId, today], (err, rows) => {
                if (err) {
                    reject(new Error(`Upcoming Query Error: ${err.message}`));
                } else {
                    // Format dates and times
                    const formattedRows = rows.map(row => ({
                        ...row,
                        eventTime: formatTime(row.date_time),
                        formattedDate: formatDate(row.date_time),
                        formattedRegDate: formatDate(row.registration_date)
                    }));
                    resolve(formattedRows || []);
                }
            });
        })
    ])
    .then(([pastOngoingAttendees, upcomingAttendees]) => {
        
        res.render('eventmanager_attendees', {
            pastOngoingAttendees,
            upcomingAttendees
        });
    })
    .catch(err => {
        console.error('Error fetching attendees:', err);
        res.status(500).render('error', { 
            message: 'Failed to load attendees. Please try again later.',
            error: err.message 
        });
    });
});
router.get('/eventmanager_analytics', isAuthenticated, (req, res) => {
    const eventManagerId = req.session.eventManagerId;
    const today = new Date().toISOString().split('T')[0]; // '2025-03-27'
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of the week (Sunday)
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
    const startOfMonth = new Date();
    startOfMonth.setDate(1); // Start of the month
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

    // Fetch revenue data
    const revenueQuery = `
        SELECT 
            SUM(e.ticket_price * ea.seats) as totalRevenue,
            SUM(CASE WHEN date(e.date_time) = ? THEN e.ticket_price * ea.seats ELSE 0 END) as todayRevenue,
            SUM(CASE WHEN date(e.date_time) >= ? THEN e.ticket_price * ea.seats ELSE 0 END) as thisWeekRevenue,
            SUM(CASE WHEN date(e.date_time) >= ? THEN e.ticket_price * ea.seats ELSE 0 END) as thisMonthRevenue
        FROM events e
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.event_manager_id = ?
    `;

    // Fetch attendee counts
    const attendeesQuery = `
        SELECT 
            COUNT(DISTINCT ea.id) as totalAttendees,
            COUNT(DISTINCT CASE WHEN date(ea.registration_date) = ? THEN ea.id ELSE NULL END) as todayAttendees,
            COUNT(DISTINCT CASE WHEN date(ea.registration_date) >= ? THEN ea.id ELSE NULL END) as thisWeekAttendees,
            COUNT(DISTINCT CASE WHEN date(ea.registration_date) >= ? THEN ea.id ELSE NULL END) as thisMonthAttendees
        FROM event_attendees ea
        JOIN events e ON ea.event_id = e.id
        WHERE e.event_manager_id = ?
    `;

    // Fetch average ticket value
    const avgTicketQuery = `
        SELECT 
            AVG(e.ticket_price) as avgTotal,
            AVG(CASE WHEN date(e.date_time) = ? THEN e.ticket_price ELSE NULL END) as avgToday,
            AVG(CASE WHEN date(e.date_time) >= ? THEN e.ticket_price ELSE NULL END) as avgThisWeek,
            AVG(CASE WHEN date(e.date_time) >= ? THEN e.ticket_price ELSE NULL END) as avgThisMonth
        FROM events e
        LEFT JOIN event_attendees ea ON e.id = ea.event_id
        WHERE e.event_manager_id = ?
          AND e.ticket_price > 0
    `;

    Promise.all([
        new Promise((resolve, reject) => {
            db.get(revenueQuery, [today, startOfWeekStr, startOfMonthStr, eventManagerId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }),
        new Promise((resolve, reject) => {
            db.get(attendeesQuery, [today, startOfWeekStr, startOfMonthStr, eventManagerId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }),
        new Promise((resolve, reject) => {
            db.get(avgTicketQuery, [today, startOfWeekStr, startOfMonthStr, eventManagerId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        })
    ])
    .then(([revenueData, attendeesData, avgTicketData]) => {
        // Calculate percentage changes (simplified for demo; in a real app, you'd compare with previous periods)
        const revenue = {
            total: revenueData.totalRevenue || 0,
            today: revenueData.todayRevenue || 0,
            thisWeek: revenueData.thisWeekRevenue || 0,
            thisMonth: revenueData.thisMonthRevenue || 0,
            todayChange: revenueData.todayRevenue ? 15 : 0, // Placeholder
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
    })
    .catch(err => {
        console.error('Error fetching analytics:', err);
        res.status(500).render('error', { 
            message: 'Failed to load analytics. Please try again later.',
            error: err.message 
        });
    });
});

const bcrypt = require('bcrypt');


// GET: Render profile page
router.get('/eventmanager_profile', isAuthenticated, (req, res) => {
    const eventManagerId = req.session.eventManagerId;

    const query = `
        SELECT name, email, contact_number, company_name, location,
               (SELECT COUNT(*) FROM events WHERE event_manager_id = ?) as eventsManaged
        FROM event_managers
        WHERE id = ?
    `;

    db.get(query, [eventManagerId, eventManagerId], (err, row) => {
        if (err) {
            console.error('Error fetching profile:', err);
            return res.status(500).render('error', { message: 'Failed to load profile', error: err.message });
        }

        if (!row) {
            return res.status(404).render('error', { message: 'Event manager not found' });
        }

        // Split name into first and last name (assuming format "First Last")
        const [firstName, ...lastNameParts] = row.name.split(' ');
        const lastName = lastNameParts.join(' ');

        // Format phone number to Indian format
        const phoneRaw = row.contact_number;
        const phone = phoneRaw ? `+91 ${phoneRaw.substring(0, 5)} ${phoneRaw.substring(5)}` : 'N/A';

        const profile = {
            name: row.name,
            firstName,
            lastName,
            email: row.email,
            phone,
            phoneRaw,
            eventType: 'Pet Events', // Placeholder; add to schema if needed
            license: `EVENT-${eventManagerId}-AB`, // Placeholder
            bio: `Experienced event manager specializing in pet events. Based in ${row.location}, working with ${row.company_name}.`,
            eventsManaged: row.eventsManaged,
            memberSince: 'January 15, 2023', // Placeholder; add to schema if needed
            image: null // Placeholder; add to schema if needed
        };

        res.render('eventmanager_profile', { profile });
    });
});

// POST: Update profile
router.post('/eventmanager_profile', isAuthenticated, upload.single('profilePic'), (req, res) => {
    const eventManagerId = req.session.eventManagerId;
    const { firstName, lastName, email, phone, eventType, license, bio } = req.body;
    const name = `${firstName} ${lastName}`.trim();
    const contact_number = phone.replace(/\D/g, '').slice(-10); // Extract last 10 digits

    const query = `
        UPDATE event_managers
        SET name = ?, email = ?, contact_number = ?
        WHERE id = ?
    `;

    db.run(query, [name, email, contact_number, eventManagerId], (err) => {
        if (err) {
            console.error('Error updating profile:', err);
            return res.status(500).json({ success: false, message: 'Failed to update profile' });
        }

        res.redirect('/eventmanager_profile');
    });
});

// POST: Update password
router.post('/eventmanager_profile/password', isAuthenticated, (req, res) => {
    const eventManagerId = req.session.eventManagerId;
    const { currentPassword, newPassword } = req.body;

    // Fetch current password
    const query = `SELECT password FROM event_managers WHERE id = ?`;
    db.get(query, [eventManagerId], (err, row) => {
        if (err) {
            console.error('Error fetching password:', err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        if (!row) {
            return res.status(404).json({ success: false, message: 'Event manager not found' });
        }

        // Verify current password
        bcrypt.compare(currentPassword, row.password, (err, match) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).json({ success: false, message: 'Server error' });
            }

            if (!match) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect' });
            }

            // Hash new password
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Error hashing password:', err);
                    return res.status(500).json({ success: false, message: 'Server error' });
                }

                // Update password
                const updateQuery = `UPDATE event_managers SET password = ? WHERE id = ?`;
                db.run(updateQuery, [hashedPassword, eventManagerId], (err) => {
                    if (err) {
                        console.error('Error updating password:', err);
                        return res.status(500).json({ success: false, message: 'Failed to update password' });
                    }

                    res.json({ success: true, message: 'Password updated successfully' });
                });
            });
        });
    });
});

// routes/eventManagerRoutes.js
router.get('/Events', (req, res) => {
    const city = req.query.city || 'none'; // Get city from query parameter
    let query = `
        SELECT id, event_name, about_event, date_time, venue, contact_number, image 
        FROM events 
        WHERE status = 'Upcoming'
    `;
    let params = [];

    if (city !== 'none') {
        query += ` AND city = ?`;
        params.push(city);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching events:', err);
            return res.status(500).send('Internal Server Error');
        }

        const events = rows.map(row => ({
            id: row.id,
            name: row.event_name,
            description: row.about_event,
            date: new Date(row.date_time).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: new Date(row.date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            location: row.venue,
            contact: row.contact_number,
            image: row.image || '/images/default_event.jpg'
        }));

        res.render('Events', { events, user: req.session.user });
    });
});
// routes/eventManagerRoutes.js
router.get('/event_booking_form', (req, res) => {
    const eventId = req.query.eventId;
    if (!eventId) {
        return res.status(400).send('Event ID is required');
    }

    db.get("SELECT event_name FROM events WHERE id = ?", [eventId], (err, row) => {
        if (err) {
            console.error('Error fetching event:', err);
            return res.status(500).send('Server error');
        }
        if (!row) {
            return res.status(404).send('Event not found');
        }
        res.render('event_booking_form', { 
            eventId, 
            eventName: row.event_name, 
            user: req.session.user 
        });
    });
});// routes/eventManagerRoutes.js
router.post('/event_booking', (req, res) => {
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

    db.run(
        `INSERT INTO event_attendees (
            event_id, user_id, name, phone_number, email, address, seats, with_pet, pet_name, pet_breed, pet_dob
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            eventId,
            user.id,
            name,
            phone_number,
            email,
            address,
            seats || 1,
            with_pet === 'yes' ? 1 : 0,
            pet_name || null,
            pet_breed || null,
            pet_dob || null
        ],
        function (err) {
            if (err) {
                console.error('Error registering attendee:', err);
                return res.status(500).json({ success: false, message: 'Registration failed', error: err.message });
            }
            console.log('Attendee inserted with ID:', this.lastID);

            db.run(
                `UPDATE events SET tickets_sold = tickets_sold + ? WHERE id = ?`,
                [seats || 1, eventId],
                (err) => {
                    if (err) {
                        console.error('Error updating tickets_sold:', err);
                        return res.status(500).json({ success: false, message: 'Failed to update tickets', error: err.message });
                    }
                    res.json({ success: true, message: 'Ticket booked successfully' });
                }
            );
        }
    );
});
module.exports = router;