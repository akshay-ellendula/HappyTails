const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    // This is the single, correct block for all initialization
    fetchEventDetails();
    fetchEventAttendees();

    // Attach event listeners to the buttons
    document.querySelector('.edit-btn').addEventListener('click', showEditForm);
    document.querySelector('.delete-btn').addEventListener('click', deleteEvent);

    // Attach the form submit listener
    document.getElementById('eventEditForm').addEventListener('submit', handleFormSubmit);
});

function goBack() {
    window.location.href = '/admin-events';
}

function fetchEventDetails() {
    const loadingMsg = document.createElement('p');
    loadingMsg.textContent = 'Loading event details...';
    loadingMsg.style.color = 'blue';
    document.getElementById('eventView').prepend(loadingMsg);

    fetch(`/admin/event/${eventId}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            loadingMsg.remove();
            if (data.success) {
                const event = data.event;
                const imageElem = document.getElementById('eventImage');
                if (event.image) {
                    imageElem.src = event.image;
                    imageElem.alt = event.name;
                    imageElem.style.display = 'block';
                } else {
                    imageElem.src = 'https://via.placeholder.com/150';
                    imageElem.alt = 'No image available';
                    imageElem.style.display = 'block';
                }
                document.getElementById('eventName').textContent = event.name;
                document.getElementById('eventDate').textContent = new Date(event.date_time).toLocaleString();
                document.getElementById('eventId').textContent = `#${event.id}`;
                document.getElementById('managerName').textContent = event.manager ? event.manager.name : 'N/A';
                document.getElementById('category').textContent = event.category;
                document.getElementById('status').textContent = event.status;
                document.getElementById('venue').textContent = event.venue;
                document.getElementById('city').textContent = event.city;
                document.getElementById('contactNumber').textContent = event.contact_number || 'N/A';
                document.getElementById('createdAt').textContent = new Date(event.created_at).toLocaleDateString();
                document.getElementById('language').textContent = event.language;
                document.getElementById('duration').textContent = event.duration;
                document.getElementById('ticketPrice').textContent = `₹${event.ticket_price.toFixed(2)}`;
                document.getElementById('ageLimit').textContent = event.age_limit;
                document.getElementById('totalTickets').textContent = event.total_tickets;
                document.getElementById('ticketsSold').textContent = event.tickets_sold;
                document.getElementById('revenue').textContent = `₹${((event.tickets_sold * event.ticket_price) * 0.94).toFixed(2)}`;
                document.getElementById('about').textContent = event.about;
                document.getElementById('instructions').textContent = event.instructions || 'N/A';
                document.getElementById('terms').textContent = event.terms || 'N/A';

                // Store the original date for use in the edit form
                document.getElementById('eventView').dataset.eventDateTime = event.date_time;
            } else {
                throw new Error(data.message || 'Failed to load event details');
            }
        })
        .catch(error => {
            loadingMsg.remove();
            const errorMsg = document.createElement('p');
            errorMsg.textContent = `Error: ${error.message}. Please try again later.`;
            errorMsg.style.color = 'red';
            document.getElementById('eventView').prepend(errorMsg);
            console.error('Error fetching event details:', error);
        });
}

function fetchEventAttendees() {
    fetch(`/admin/event/${eventId}/attendees`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('attendeesTable');
                tbody.innerHTML = '';
                data.attendees.forEach(att => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${att.ticketId}</td>
                        <td>${att.name}</td>
                        <td>${att.email}</td>
                        <td>${att.phone}</td>
                        <td>${att.seats}</td>
                        <td>${att.with_pet}</td>
                        <td>${att.registration_date}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Error fetching attendees:', error));
}

function showEditForm() {
    // Prefill form with current values (handle null/undefined)
    document.getElementById('editName').value = document.getElementById('eventName').textContent || '';
    document.getElementById('editAbout').value = document.getElementById('about').textContent || '';
    document.getElementById('editLanguage').value = document.getElementById('language').textContent || '';
    document.getElementById('editDuration').value = document.getElementById('duration').textContent || '';
    document.getElementById('editTicketPrice').value = parseFloat(document.getElementById('ticketPrice').textContent.replace('$', '')) || 0;
    document.getElementById('editAgeLimit').value = document.getElementById('ageLimit').textContent || '';
    document.getElementById('editInstructions').value = document.getElementById('instructions').textContent === 'N/A' ? '' : document.getElementById('instructions').textContent;
    document.getElementById('editVenue').value = document.getElementById('venue').textContent || '';
    document.getElementById('editTerms').value = document.getElementById('terms').textContent === 'N/A' ? '' : document.getElementById('terms').textContent;
    document.getElementById('editCategory').value = document.getElementById('category').textContent || '';
    
    // Corrected code with a validity check
     const originalDateTime = document.getElementById('eventView').dataset.eventDateTime;
    if (originalDateTime) {
        document.getElementById('editDateTime').value = new Date(originalDateTime).toISOString().slice(0, 16);
    } else {
        document.getElementById('editDateTime').value = '';
    }
    document.getElementById('editTotalTickets').value = document.getElementById('totalTickets').textContent || 1;
    document.getElementById('editCity').value = document.getElementById('city').textContent || '';
    document.getElementById('editContactNumber').value = document.getElementById('contactNumber').textContent || '';

    // Clear error messages
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

    // Show edit form, hide view
    document.getElementById('eventView').style.display = 'none';
    document.getElementById('editForm').style.display = 'block';
   
}

function validateForm() {
    // Validation logic as it was before
    let isValid = true;
    document.querySelectorAll('.error-message').forEach(error => error.textContent = '');

    const name = document.getElementById('editName');
    if (name.value.trim().length < 3) {
        document.getElementById('nameError').textContent = 'Event name must be at least 3 characters';
        isValid = false;
    }

    const about = document.getElementById('editAbout');
    if (about.value.trim().length < 10) {
        document.getElementById('aboutError').textContent = 'About event must be at least 10 characters';
        isValid = false;
    }

    const language = document.getElementById('editLanguage');
    if (language.value.trim().length < 2) {
        document.getElementById('languageError').textContent = 'Language must be at least 2 characters';
        isValid = false;
    }

    const duration = document.getElementById('editDuration');
    if (!/^\d+h\s*\d*m?$/.test(duration.value.trim())) {
        document.getElementById('durationError').textContent = 'Invalid duration format (e.g., 2h 30m)';
        isValid = false;
    }

    const ticketPrice = document.getElementById('editTicketPrice');
    if (ticketPrice.value < 0) {
        document.getElementById('ticketPriceError').textContent = 'Ticket price must be a positive number';
        isValid = false;
    }

    const ageLimit = document.getElementById('editAgeLimit');
    if (!/^\d+\+?$/.test(ageLimit.value.trim())) {
        document.getElementById('ageLimitError').textContent = 'Invalid age limit format (e.g., 18+)';
        isValid = false;
    }

    const venue = document.getElementById('editVenue');
    if (venue.value.trim().length < 3) {
        document.getElementById('venueError').textContent = 'Venue must be at least 3 characters';
        isValid = false;
    }

    const category = document.getElementById('editCategory');
    if (category.value.trim().length < 2) {
        document.getElementById('categoryError').textContent = 'Category must be at least 2 characters';
        isValid = false;
    }

    const dateTime = document.getElementById('editDateTime');
    if (!dateTime.value || isNaN(new Date(dateTime.value))) {
        document.getElementById('dateTimeError').textContent = 'Invalid date and time';
        isValid = false;
    }

    const totalTickets = document.getElementById('editTotalTickets');
    if (totalTickets.value < 1) {
        document.getElementById('totalTicketsError').textContent = 'Total tickets must be at least 1';
        isValid = false;
    }

    const city = document.getElementById('editCity');
    if (city.value.trim().length < 2) {
        document.getElementById('cityError').textContent = 'City must be at least 2 characters';
        isValid = false;
    }

    const contactNumber = document.getElementById('editContactNumber');
    if (contactNumber.value && !/^\+91[6-9][0-9]{9}$/.test(contactNumber.value)) {
        document.getElementById('contactNumberError').textContent = 'Enter valid Indian mobile number (+91XXXXXXXXXX)';
        isValid = false;
    }

    return isValid;
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const updatedEvent = {
        event_name: document.getElementById('editName').value,
        about_event: document.getElementById('editAbout').value,
        language: document.getElementById('editLanguage').value,
        duration: document.getElementById('editDuration').value,
        ticket_price: parseFloat(document.getElementById('editTicketPrice').value),
        age_limit: document.getElementById('editAgeLimit').value,
        venue: document.getElementById('editVenue').value,
        category: document.getElementById('editCategory').value,
        date_time: new Date(document.getElementById('editDateTime').value).toISOString(),
        total_tickets: parseInt(document.getElementById('editTotalTickets').value),
        city: document.getElementById('editCity').value,
        contact_number: document.getElementById('editContactNumber').value,
        instructions: document.getElementById('editInstructions').value || undefined,
        terms: document.getElementById('editTerms').value || undefined
    };

    fetch(`/admin/event/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Event updated successfully!');
                fetchEventDetails();
                cancelEdit();
            } else {
                alert('Failed to update event: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error updating event:', error);
            alert('Error updating event');
        });
}

function cancelEdit() {
    document.getElementById('editForm').style.display = 'none';
    document.getElementById('eventView').style.display = 'block';
}

function deleteEvent() {
    if (!confirm('Are you sure you want to delete this event? This will also delete all associated attendees.')) return;

    fetch(`/admin/events/${eventId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Event deleted successfully!');
                goBack();
            } else {
                alert('Failed to delete event: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error deleting event:', error);
            alert('Error deleting event');
        });
}