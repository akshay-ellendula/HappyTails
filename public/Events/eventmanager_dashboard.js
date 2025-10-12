        function openEventForm() {
            document.getElementById('eventFormModal').style.display = 'block';
        }
        function closeEventForm() {
            document.getElementById('eventFormModal').style.display = 'none';
        }
        function showEventDetails(eventName, ticketsSold, revenue) {
            document.getElementById('eventDetailsTitle').textContent = eventName;
            document.getElementById('ticketsSold').textContent = ticketsSold;
            document.getElementById('revenueGenerated').textContent = revenue;
            document.getElementById('eventDetailsModal').style.display = 'block';
        }
        function closeEventDetails() {
            document.getElementById('eventDetailsModal').style.display = 'none';
        }
        function openEditAttendeeModal(attendeeId, name, phone, eventName, date, seats) {
            document.getElementById('editAttendeeId').value = attendeeId;
            document.getElementById('editName').value = name;
            document.getElementById('editPhone').value = phone;
            document.getElementById('editEvent').value = eventName;
            document.getElementById('editDate').value = date;
            document.getElementById('editSeats').value = seats;
            document.getElementById('editAttendeeModal').style.display = 'block';
        }
        function closeEditAttendeeModal() {
            document.getElementById('editAttendeeModal').style.display = 'none';
        }

        async function saveAttendee(event) {
    event.preventDefault();
    const attendeeId = document.getElementById('editAttendeeId').value;
    if (!attendeeId) return alert('Error: Attendee ID is missing.');

    // Get values from the form
    const name = document.getElementById("editName").value.trim();
    const phone = document.getElementById("editPhone").value.trim(); // Frontend uses 'phone'
    const seats = document.getElementById("editSeats").value; // Get the read-only seats value

    // Validate inputs
    const phonePattern = /^[0-9]{10}$/;
    if (!name) return alert("⚠️ Name cannot be empty.");
    if (!phonePattern.test(phone)) return alert("⚠️ Please enter a valid 10-digit phone number.");

    try {
        // Correctly call the PUT endpoint with the ID in the URL
        const response = await fetch(`/eventmanager_dashboard/updateAttendee/${attendeeId}`, {
            method: 'PUT', // ✅ Changed to PUT
            headers: { 'Content-Type': 'application/json' },
            // ✅ Body matches the controller's expected fields
            body: JSON.stringify({
                name: name,
                phone_number: phone, // Map frontend 'phone' to backend 'phone_number'
                seats: seats
            })
        });
        const result = await response.json();
        if (response.ok) {
            alert("Attendee updated successfully!");
            window.location.reload(); // Reload to see changes
        } else {
            alert("Error updating attendee: " + (result.message || "Update failed"));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("A network error occurred. Please try again.");
    }
}

        async function deleteAttendee(attendeeId) {
            // Debugging: Check if the ID is present before fetching
            if (!attendeeId) {
                alert('Error: Attendee ID is missing. Cannot delete.');
                return;
            }
            if (confirm('Are you sure you want to delete this attendee?')) {
                try {
                    const response = await fetch(`/eventmanager_dashboard/deleteAttendee/${attendeeId}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    if (response.ok) {
                        alert('Attendee deleted successfully!');
                        window.location.reload();
                    } else {
                        alert('Error deleting attendee: ' + result.message);
                    }
                } catch (error) {
                    console.error('Error deleting attendee:', error);
                    alert('Error deleting attendee');
                }
            }
        }
        // NEW: MAIN EVENT LISTENER USING EVENT DELEGATION
        document.addEventListener('DOMContentLoaded', function() {
            const attendeeTable = document.getElementById('attendeeTable');

            if (attendeeTable) {
                attendeeTable.addEventListener('click', function(event) {
                    const button = event.target;

                    // Check if an EDIT button was clicked
                    if (button.classList.contains('edit-btn')) {
                        const data = button.dataset;
                        if (data.id) {
                            openEditAttendeeModal(
                                data.id,
                                data.name,
                                data.phone,
                                data.event,
                                data.date,
                                data.seats
                            );
                        } else {
                            console.error('ID is missing from the edit button!');
                        }
                    }
                    // Check if a DELETE button was clicked
                    if (button.classList.contains('delete-btn')) {
                        const attendeeId = button.dataset.id;
                        if (attendeeId) {
                            deleteAttendee(attendeeId);
                        } else {
                            console.error('ID is missing from the delete button!');
                        }
                    }
                });
            }
        });

        async function submitEvent(event) {
        event.preventDefault();

        const eventPhoto = document.getElementById("eventPhoto");
        const eventName = document.getElementById("eventName");
        const aboutEvent = document.getElementById("aboutEvent");
        const language = document.getElementById("language");
        const duration = document.getElementById("duration");
        const tickets = document.getElementById("tickets");
        const ageLimit = document.getElementById("ageLimit");
        const instructions = document.getElementById("instructions");
        const venue = document.getElementById("venue");
        const terms = document.getElementById("terms");
        const category = document.getElementById("category");
        const dateTime = document.getElementById("dateTime");

        // ✅ Validation Section
        if (
            !eventPhoto.files[0] ||
            !eventName.value.trim() ||
            !aboutEvent.value.trim() ||
            !language.value.trim() ||
            !duration.value.trim() ||
            !tickets.value.trim() ||
            !ageLimit.value.trim() ||
            !instructions.value.trim() ||
            !venue.value.trim() ||
            !terms.value.trim() ||
            !category.value.trim() ||
            !dateTime.value.trim()
        ) {
            alert("⚠️ Please fill in all fields before submitting.");
            return;
        }

        // Validate image type
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
        if (!allowedTypes.includes(eventPhoto.files[0].type)) {
            alert("⚠️ Please upload a valid image (JPEG, PNG, JPG, or WEBP).");
            return;
        }

        // Validate ticket price
        const ticketPrice = parseFloat(tickets.value);
        if (isNaN(ticketPrice) || ticketPrice <= 0) {
            alert("⚠️ Ticket price must be a positive number.");
            return;
        }

        // Validate age limit
        const age = parseInt(ageLimit.value);
        if (isNaN(age) || age < 0) {
            alert("⚠️ Age limit must be a valid non-negative number.");
            return;
        }

        // Validate future date
        const eventDate = new Date(dateTime.value);
        const now = new Date();
        if (eventDate <= now) {
            alert("⚠️ Please select a future date and time for your event.");
            return;
        }

        // Validate duration format (e.g., “2h” or “1.5h”)
        const durationPattern = /^[0-9]+(\.[0-9]+)?h$/;
        if (!durationPattern.test(duration.value.trim())) {
            alert("⚠️ Duration should be in format like '2h' or '1.5h'.");
            return;
        }

        // ✅ If all validations pass, build FormData
        const formData = new FormData();
        formData.append("eventPhoto", eventPhoto.files[0]);
        formData.append("eventName", eventName.value);
        formData.append("aboutEvent", aboutEvent.value);
        formData.append("language", language.value);
        formData.append("duration", duration.value);
        formData.append("tickets", tickets.value);
        formData.append("ageLimit", ageLimit.value);
        formData.append("instructions", instructions.value);
        formData.append("venue", venue.value);
        formData.append("terms", terms.value);
        formData.append("category", category.value);
        formData.append("dateTime", dateTime.value);

        try {
            const response = await fetch("/eventmanager_dashboard/createEvent", {
            method: "POST",
            body: formData,
            });

            const result = await response.json();

            if (response.ok) {
            alert("🎉 Event created successfully!");
            window.location.reload(); // Refresh to show new event
            } else {
            alert("❌ Error creating event: " + (result.message || "Unknown error"));
            }
        } catch (error) {
            console.error("Error creating event:", error);
            alert("⚠️ Network or server error while creating event.");
        }

        closeEventForm();
        document.getElementById("eventForm").reset();
        }

        // Optional: Close modal function
        function closeEventForm() {
        document.getElementById("eventFormModal").style.display = "none";
        }