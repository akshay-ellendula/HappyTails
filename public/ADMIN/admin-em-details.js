// Whole file for admin-em-details.js
// public/ADMIN/admin-em-details.js
const urlParams = new URLSearchParams(window.location.search);
const managerId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    fetchManagerDetails();
    fetchEventMetrics();
    fetchUpcomingEvents();
    fetchPastEvents();
    document.getElementById('managerEditForm').addEventListener('submit', handleFormSubmit);
});

function goBack() {
    window.location.href = '/admin-eventManager';
}

function fetchManagerDetails() {
    fetch(`/admin/event-manager/${managerId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const manager = data.manager;
                const avatar = document.getElementById('managerAvatar');
                console.log('Manager image from API:', manager.image); // Debug log
                if (manager.image) {
                    // Check if image already has a data URL prefix
                    const imageUrl = manager.image.startsWith('data:image') ? manager.image : `data:image/png;base64,${manager.image}`;
                    avatar.style.backgroundImage = `url('${imageUrl}')`;
                    avatar.style.backgroundColor = 'transparent'; // Remove fallback color
                    avatar.textContent = ''; // Remove initial letter
                } else {
                    avatar.textContent = manager.name.charAt(0); // Fallback to initial
                    avatar.style.backgroundImage = 'none';
                    avatar.style.backgroundColor = 'var(--event-color)';
                }
                document.getElementById('managerName').textContent = manager.name;
                document.getElementById('managerEmail').textContent = manager.email;
                document.getElementById('managerId').textContent = `#${manager.id}`;
                document.getElementById('joinedDate').textContent = new Date(manager.joined_date).toLocaleDateString();
                document.getElementById('organization').textContent = manager.organization;
                document.getElementById('managerPhone').textContent = manager.phone || 'N/A';
            } else {
                alert('Failed to load manager details: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching manager details:', error);
            alert('Error loading manager details');
        });
}
function fetchEventMetrics() {
    fetch(`/admin/event-manager/${managerId}/metrics`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const metrics = data.metrics;
                document.getElementById('upcomingEvents').textContent = metrics.upcoming;
                document.getElementById('weeklyEvents').textContent = metrics.weekly;
                document.getElementById('monthlyEvents').textContent = metrics.monthly;
                document.getElementById('satisfactionRate').textContent = 'N/A'; // Add satisfaction logic if available

                const tbody = document.getElementById('monthlyBreakdown');
                tbody.innerHTML = '';
                metrics.monthly_breakdown.forEach((row, index) => {
                    const growth = index === 0 || !metrics.monthly_breakdown[index - 1].avg_attendance
                        ? 0
                        : ((row.avg_attendance - metrics.monthly_breakdown[index - 1].avg_attendance) / metrics.monthly_breakdown[index - 1].avg_attendance * 100).toFixed(1);
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${row.month}</td>
                        <td>${row.total_events}</td>
                        <td>${row.attendees}</td>
                        <td>${row.avg_attendance.toFixed(1)}</td>
                        <td>${growth > 0 ? '+' : ''}${growth}%</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Error fetching metrics:', error));
}

function fetchUpcomingEvents() {
    fetch(`/admin/event-manager/${managerId}/upcoming-events`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('upcomingEventsTable');
                tbody.innerHTML = '';
                data.events.forEach(event => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${event.event_id}</td>
                        <td>${event.event_name}</td>
                        <td>${new Date(event.date).toLocaleDateString()}</td>
                        <td>${event.location}</td>
                        <td>${event.tickets_sold}/${event.total_tickets}</td>
                        <td><span class="status-active">${event.status}</span></td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Error fetching upcoming events:', error));
}

function fetchPastEvents() {
    fetch(`/admin/event-manager/${managerId}/past-events`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('pastEventsTable');
                tbody.innerHTML = '';
                data.events.forEach(event => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${event.event_id}</td>
                        <td>${event.event_name}</td>
                        <td>${new Date(event.date).toLocaleDateString()}</td>
                        <td>${event.attendees}</td>
                        <td>N/A</td> <!-- Satisfaction rate not implemented yet -->
                    `;
                    tbody.appendChild(tr);
                });
            }
        })
        .catch(error => console.error('Error fetching past events:', error));
}

function showEditForm() {
    const managerName = document.getElementById('managerName').textContent;
    const managerEmail = document.getElementById('managerEmail').textContent;
    const organization = document.getElementById('organization').textContent;
    const managerPhone = document.getElementById('managerPhone').textContent;

    document.getElementById('editName').value = managerName;
    document.getElementById('editEmail').value = managerEmail;
    document.getElementById('editOrganization').value = organization;
    document.getElementById('editPhone').value = managerPhone;

    document.getElementById('managerView').style.display = 'none';
    document.getElementById('editForm').style.display = 'block';
}

function cancelEdit() {
    document.getElementById('editForm').style.display = 'none';
    document.getElementById('managerView').style.display = 'block';
}

function validateForm() {
    let isValid = true;
    document.querySelectorAll('.error-message').forEach(error => error.textContent = '');

    const name = document.getElementById('editName');
    if (name.value.trim().length < 2) {
        document.getElementById('nameError').textContent = 'Name must be at least 2 characters';
        isValid = false;
    }

    const email = document.getElementById('editEmail');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        document.getElementById('emailError').textContent = 'Please enter a valid email address';
        isValid = false;
    }

    const organization = document.getElementById('editOrganization');
    if (organization.value.trim().length < 3) {
        document.getElementById('organizationError').textContent = 'Organization must be at least 3 characters';
        isValid = false;
    }

    const phone = document.getElementById('editPhone');
    if (!/^\+91[6-9][0-9]{9}$/.test(phone.value)) {
        document.getElementById('phoneError').textContent = 'Enter valid Indian mobile number (+91XXXXXXXXXX)';
        isValid = false;
    }

    return isValid;
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const updatedManager = {
        name: document.getElementById('editName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value,
        organization: document.getElementById('editOrganization').value
    };

    fetch(`/admin/event-manager/${managerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedManager)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Event manager updated successfully!');
                fetchManagerDetails(); // Refresh details
                cancelEdit();
            } else {
                alert('Failed to update manager: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error updating manager:', error);
            alert('Error updating manager');
        });
}

function deleteManager() {
    if (!confirm('Are you sure you want to delete this event manager? This will also delete all associated events.')) return;

    fetch(`/admin/event-manager/${managerId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Event manager deleted successfully!');
                goBack();
            } else {
                alert('Failed to delete manager: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error deleting manager:', error);
            alert('Error deleting manager');
        });
}