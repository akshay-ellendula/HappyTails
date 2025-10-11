// MODAL FUNCTIONS (no changes needed here)
function openEventForm() {
    document.getElementById("eventFormModal").style.display = "block";
}
function closeEventForm() {
    document.getElementById("eventFormModal").style.display = "none";
}
function showEventDetails(eventName, ticketsSold, revenue) {
    document.getElementById("eventDetailsTitle").textContent = eventName;
    document.getElementById("ticketsSold").textContent = ticketsSold;
    document.getElementById("revenueGenerated").textContent = revenue;
    document.getElementById("eventDetailsModal").style.display = "block";
}
function closeEventDetails() {
    document.getElementById("eventDetailsModal").style.display = "none";
}
function openEditAttendeeModal(
    attendeeId,
    name,
    phone,
    eventName,
    date,
    seats
) {
    document.getElementById("editAttendeeId").value = attendeeId;
    document.getElementById("editName").value = name;
    document.getElementById("editPhone").value = phone;
    document.getElementById("editEvent").value = eventName;
    document.getElementById("editDate").value = date;
    document.getElementById("editSeats").value = seats;
    document.getElementById("editAttendeeModal").style.display = "block";
}
function closeEditAttendeeModal() {
    document.getElementById("editAttendeeModal").style.display = "none";
}

// API CALLS / ASYNC FUNCTIONS
async function saveAttendee(event) {
    event.preventDefault();
    const attendeeId = document.getElementById("editAttendeeId").value;
    // Debugging: Check if the ID is present before fetching
    if (!attendeeId) {
        alert("Error: Attendee ID is missing. Cannot save.");
        return;
    }

    const updatedData = {
        name: document.getElementById("editName").value,
        phone_number: document.getElementById("editPhone").value,
        seats: document.getElementById("editSeats").value,
    };

    try {
        const response = await fetch(
            `/eventmanager_dashboard/updateAttendee/${attendeeId}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData),
            }
        );
        const result = await response.json();
        if (response.ok) {
            alert("Attendee updated successfully!");
            window.location.reload();
        } else {
            alert("Error updating attendee: " + result.message);
        }
    } catch (error) {
        console.error("Error updating attendee:", error);
        alert("Error updating attendee");
    }
    closeEditAttendeeModal();
}

async function deleteAttendee(attendeeId) {
    // Debugging: Check if the ID is present before fetching
    if (!attendeeId) {
        alert("Error: Attendee ID is missing. Cannot delete.");
        return;
    }
    if (confirm("Are you sure you want to delete this attendee?")) {
        try {
            const response = await fetch(
                `/eventmanager_dashboard/deleteAttendee/${attendeeId}`,
                {
                    method: "DELETE",
                }
            );
            const result = await response.json();
            if (response.ok) {
                alert("Attendee deleted successfully!");
                window.location.reload();
            } else {
                alert("Error deleting attendee: " + result.message);
            }
        } catch (error) {
            console.error("Error deleting attendee:", error);
            alert("Error deleting attendee");
        }
    }
}

// NEW: MAIN EVENT LISTENER USING EVENT DELEGATION
document.addEventListener("DOMContentLoaded", function () {
    const attendeeTable = document.getElementById("attendeeTable");

    if (attendeeTable) {
        attendeeTable.addEventListener("click", function (event) {
            const button = event.target;

            // Check if an EDIT button was clicked
            if (button.classList.contains("edit-btn")) {
                const data = button.dataset;
                console.log("Edit button clicked. Data ID:", data.id); // DEBUGGING LINE
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
                    console.error("ID is missing from the edit button!");
                }
            }

            // Check if a DELETE button was clicked
            if (button.classList.contains("delete-btn")) {
                const attendeeId = button.dataset.id;
                console.log("Delete button clicked. Data ID:", attendeeId); // DEBUGGING LINE
                if (attendeeId) {
                    deleteAttendee(attendeeId);
                } else {
                    console.error("ID is missing from the delete button!");
                }
            }
        });
    }
});
// Form Submission for Creating a New Event
async function submitEvent(event) {
    event.preventDefault();

    if (!validateForm()) {
        console.log("Validation failed. Form not submitted.");
        return;
    }

    const formData = new FormData();
    formData.append(
        "eventPhoto",
        document.getElementById("eventPhoto").files[0]
    );
    formData.append(
        "eventName",
        document.getElementById("eventName").value
    );
    formData.append(
        "aboutEvent",
        document.getElementById("aboutEvent").value
    );
    formData.append("language", document.getElementById("language").value);
    formData.append("duration", document.getElementById("duration").value);
    formData.append("tickets", document.getElementById("tickets").value);
    formData.append("ageLimit", document.getElementById("ageLimit").value);
    formData.append(
        "instructions",
        document.getElementById("instructions").value
    );
    formData.append("venue", document.getElementById("venue").value);
    formData.append("terms", document.getElementById("terms").value);
    formData.append("category", document.getElementById("category").value);
    formData.append("dateTime", document.getElementById("dateTime").value);

    try {
        const response = await fetch("/eventmanager_dashboard/createEvent", {
            method: "POST",
            body: formData,
        });
        const result = await response.json();
        if (response.ok) {
            alert("Event created successfully!");
            window.location.reload(); // Refresh to show the new event
        } else {
            alert("Error creating event: " + result.message);
        }
    } catch (error) {
        console.error("Error creating event:", error);
        alert("Error creating event");
    }
    closeEventForm();
    document.getElementById("eventForm").reset();
}

// Helper function to show an error message
function showError(inputId, message) {
    const inputElement = document.getElementById(inputId);
    const errorElement =
        inputElement.parentElement.querySelector(".error-message");

    inputElement.classList.add("invalid");
    errorElement.textContent = message;
}

// Helper function to clear all error messages
function clearErrors() {
    const errorMessages = document.querySelectorAll(".error-message");
    errorMessages.forEach((el) => (el.textContent = ""));

    const invalidInputs = document.querySelectorAll(".invalid");
    invalidInputs.forEach((el) => el.classList.remove("invalid"));
}

// The main validation function
function validateForm() {
    clearErrors();
    let isValid = true;

    // 1. Event Photo Validation (File size and type)
    const eventPhoto = document.getElementById("eventPhoto");
    if (eventPhoto.files.length > 0) {
        const file = eventPhoto.files[0];
        const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
        const maxSize = 5 * 1024 * 1024; // 5 MB

        if (!allowedTypes.includes(file.type)) {
            showError(
                "eventPhoto",
                "Invalid file type. Please use JPG, PNG, or GIF."
            );
            isValid = false;
        }
        if (file.size > maxSize) {
            showError("eventPhoto", "File is too large. Maximum size is 5 MB.");
            isValid = false;
        }
    } else {
        showError("eventPhoto", "Event photo is required.");
        isValid = false;
    }

    // 2. Event Name Validation (Min length)
    const eventName = document.getElementById("eventName").value.trim();
    if (eventName.length < 5) {
        showError(
            "eventName",
            "Event name must be at least 5 characters long."
        );
        isValid = false;
    }

    // 3. Ticket Price Validation (Must be a positive number)
    const ticketPrice = document.getElementById("tickets").value.trim();
    if (isNaN(ticketPrice) || parseFloat(ticketPrice) < 0) {
        showError("tickets", "Please enter a valid, non-negative price.");
        isValid = false;
    }

    // 4. Age Limit Validation (Must be a non-negative integer)
    const ageLimit = document.getElementById("ageLimit").value.trim();
    if (ageLimit < 0 || !Number.isInteger(Number(ageLimit))) {
        showError("ageLimit", "Please enter a valid age (0 or greater).");
        isValid = false;
    }

    // 5. Category Validation
    const category = document.getElementById("category").value;
    if (category === "") {
        showError("category", "Please select a category.");
        isValid = false;
    }

    // 6. Date and Time Validation (Must be in the future)
    const dateTime = document.getElementById("dateTime").value;
    if (dateTime && new Date(dateTime) < new Date()) {
        showError(
            "dateTime",
            "The event date and time must be in the future."
        );
        isValid = false;
    }

    // You can add similar checks for all other required text fields
    // to ensure they are not empty, although the 'required' attribute
    // already handles this for many browsers.
    const requiredTextIds = [
        "aboutEvent",
        "language",
        "duration",
        "instructions",
        "venue",
        "terms",
    ];
    requiredTextIds.forEach((id) => {
        const value = document.getElementById(id).value.trim();
        if (value === "") {
            showError(id, "This field is required.");
            isValid = false;
        }
    });

    return isValid;
}
