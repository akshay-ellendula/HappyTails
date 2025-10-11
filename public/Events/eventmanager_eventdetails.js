// --- MODAL FUNCTIONS ---
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
        if (!attendeeId) return alert('Error: Attendee ID is missing.');
        
        if (confirm('Are you sure you want to delete this attendee booking?')) {
            try {
                const response = await fetch(`/eventmanager_dashboard/deleteAttendee/${attendeeId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                if (response.ok) {
                    alert('Attendee deleted successfully!');
                    window.location.reload();
                } else {
                    alert('Error: ' + (result.message || 'Deletion failed'));
                }
            } catch (error) {
                alert('An error occurred. Please try again.');
            }
        }
    }

    // --- MAIN EVENT LISTENER & FILTER ---
    document.addEventListener('DOMContentLoaded', function() {
        const tableBody = document.getElementById('attendeeTableBody');
        if (tableBody) {
            tableBody.addEventListener('click', function(event) {
                const button = event.target.closest('button'); // More robust way to get the button
                if (!button) return;

                if (button.classList.contains('edit-btn')) {
                    const data = button.dataset;
                    if (data.id) {
                        openEditAttendeeModal(data.id, data.name, data.phone, data.event, data.date, data.seats);
                    }
                }

                if (button.classList.contains('delete-btn')) {
                    const attendeeId = button.dataset.id;
                    if (attendeeId) {
                        deleteAttendee(attendeeId);
                    }
                }
            });
        }
    });

    function filterAttendees() {
        const filter = document.getElementById('attendeeSearch').value.toLowerCase();
        const rows = document.getElementById('attendeeTableBody').getElementsByTagName('tr');
        
        for (let row of rows) {
            const ticketIdCell = row.cells[0].textContent.toLowerCase();
            const nameCell = row.cells[1].textContent.toLowerCase();
            const emailCell = row.cells[3].textContent.toLowerCase();
            
            if (ticketIdCell.includes(filter) || nameCell.includes(filter) || emailCell.includes(filter)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        }
    }