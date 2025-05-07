const { Event, Attendee } = require('../models/database'); // Adjust path to your database.js

// Render event manager dashboard (assumes views/event_manager_dashboard.ejs)
exports.renderEventManagerDashboard = async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'event-manager') {
    req.session.errorMessage = 'Please log in as an Event Manager';
    return res.redirect('/service_provider_login');
  }

  try {
    const eventManagerId = req.session.user.id;

    // Initialize default values in case of query failures
    let overview = { totalBookings: 'N/A', totalEarnings: 'N/A', totalEvents: 'N/A' };
    let ongoingEvents = [];
    let upcomingEvents = [];
    let attendees = [];

    // Fetch overview metrics
    try {
      const totalBookings = await Attendee.countDocuments({ event_manager_id: eventManagerId });
      const totalEvents = await Event.countDocuments({ event_manager_id: eventManagerId });
      const earningsResult = await Attendee.aggregate([
        { $match: { event_manager_id: eventManagerId } },
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
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$seats', '$event.ticket_price'] } }
          }
        }
      ]);

      overview = {
        totalBookings: totalBookings || 0,
        totalEarnings: earningsResult[0]?.total || 0,
        totalEvents: totalEvents || 0
      };
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
    }

    // Fetch ongoing events (events happening now)
    try {
      const now = new Date();
      ongoingEvents = await Event.find({
        event_manager_id: eventManagerId,
        date_time: { $lte: now },
        end_time: { $gte: now }
      }).select('event_name tickets_sold ticket_price image date_time');
    } catch (error) {
      console.error('Error fetching ongoing events:', error);
    }

    // Fetch upcoming events (events in the future)
    try {
      const now = new Date();
      upcomingEvents = await Event.find({
        event_manager_id: eventManagerId,
        date_time: { $gt: now }
      }).select('event_name tickets_sold total_tickets ticket_price image date_time');
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }

    // Fetch attendees
    try {
      attendees = await Attendee.find({ event_manager_id: eventManagerId })
        .populate('event_id', 'event_name date_time')
        .select('name phone_number seats event_id')
        .lean()
        .then(attendees => attendees.map(attendee => ({
          id: attendee._id,
          name: attendee.name,
          phone_number: attendee.phone_number,
          seats: attendee.seats,
          event_name: attendee.event_id?.event_name || 'N/A',
          event_date: attendee.event_id?.date_time || null
        })));
    } catch (error) {
      console.error('Error fetching attendees:', error);
    }

    res.render('/eventmanager_dashboard', {
      user: req.session.user,
      overview,
      ongoingEvents,
      upcomingEvents,
      attendees
    });
  } catch (error) {
    console.error('Error rendering event manager dashboard:', error);
    res.status(500).send('Server error');
  }
};

// Create a new event
exports.createEvent = async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'event-manager') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const {
      eventName,
      aboutEvent,
      language,
      duration,
      tickets,
      ageLimit,
      instructions,
      venue,
      terms,
      category,
      dateTime
    } = req.body;

    // Validate input
    if (!eventName || !dateTime || !tickets || !venue || !category) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    // Handle file upload
    const image = req.file ? `/uploads/${req.file.filename}` : '/images/default_event.jpg';

    // Create new event
    const event = new Event({
      event_name: eventName,
      about: aboutEvent,
      language,
      duration,
      ticket_price: parseFloat(tickets),
      age_limit: parseInt(ageLimit),
      instructions,
      venue,
      terms,
      category,
      date_time: new Date(dateTime),
      image,
      event_manager_id: req.session.user.id,
      tickets_sold: 0,
      total_tickets: 100 // Default value, adjust as needed
    });

    await event.save();

    res.status(200).json({ success: true, message: 'Event created successfully' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update an attendee
exports.updateAttendee = async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'event-manager') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const { name, phone_number, seats } = req.body;

    // Validate input
    if (!name || !phone_number || !seats) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    // Update attendee
    const attendee = await Attendee.findOneAndUpdate(
      { _id: id, event_manager_id: req.session.user.id },
      { name, phone_number, seats: parseInt(seats) },
      { new: true }
    );

    if (!attendee) {
      return res.status(404).json({ success: false, message: 'Attendee not found' });
    }

    res.status(200).json({ success: true, message: 'Attendee updated successfully' });
  } catch (error) {
    console.error('Error updating attendee:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete an attendee
exports.deleteAttendee = async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'event-manager') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;

    // Delete attendee
    const attendee = await Attendee.findOneAndDelete({
      _id: id,
      event_manager_id: req.session.user.id
    });

    if (!attendee) {
      return res.status(404).json({ success: false, message: 'Attendee not found' });
    }

    res.status(200).json({ success: true, message: 'Attendee deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendee:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};