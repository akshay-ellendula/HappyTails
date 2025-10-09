// ADMIN/admin-user-details.js

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');

// Function to go back to users page
function goBack() {
    window.location.href = "/admin-user";
}

// Function to fetch user details from the backend
async function fetchUserDetails() {
    try {
        const response = await fetch(`/admin/user/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            const user = data.user;
            const avatar = document.getElementById('userAvatar');
            const name = document.getElementById('userName');
            const email = document.getElementById('userEmail');
            const userIdSpan = document.getElementById('userId');
            const joinedDate = document.getElementById('joinedDate');
            const address = document.getElementById('userAddress');
            const phone = document.getElementById('userPhone');
            const purchaseTable = document.getElementById('purchaseHistoryTable');
            const eventTable = document.getElementById('eventHistoryTable');

            if (avatar) avatar.textContent = user.name.charAt(0);
            if (userIdSpan) userIdSpan.textContent = `#USR${String(user.id).padStart(3, '0')}`;
            if (joinedDate) joinedDate.textContent = user.joined_date;
            if (address) address.textContent = user.address || 'Not provided';
            if (phone) phone.textContent = user.phone || 'Not provided';

            // Populate purchase history
            if (purchaseTable) {
                purchaseTable.innerHTML = '';
                if (data.purchaseHistory.length > 0) {
                    data.purchaseHistory.forEach(item => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${item.productId}</td>
                            <td>${item.productName}</td>
                            <td>${item.purchaseDate}</td>
                            <td>${item.price}</td>
                        `;
                        purchaseTable.appendChild(row);
                    });
                } else {
                    purchaseTable.innerHTML = '<tr><td colspan="4">No purchase history</td></tr>';
                }
            }

            // Populate event history
            if (eventTable) {
                eventTable.innerHTML = '';
                if (data.eventHistory.length > 0) {
                    data.eventHistory.forEach(ev => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${ev.eventId}</td>
                            <td>${ev.eventName}</td>
                            <td>${ev.date}</td>
                            <td>${ev.location}</td>
                            <td>${ev.status}</td>
                        `;
                        eventTable.appendChild(row);
                    });
                } else {
                    eventTable.innerHTML = '<tr><td colspan="5">No event participation</td></tr>';
                }
            }
        } else {
            alert('Failed to load user details: ' + data.message);
            goBack();
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        alert('An error occurred while fetching user details.');
    }
}

// Function to show edit form and populate it
function showEditForm() {
    const userView = document.getElementById('userView');
    const editForm = document.getElementById('editForm');
    const name = document.getElementById('userName')?.textContent || '';
    const email = document.getElementById('userEmail')?.textContent || '';
    const address = document.getElementById('userAddress')?.textContent || '';
    const phone = document.getElementById('userPhone')?.textContent || '';

    if (userView) userView.style.display = 'none';
    if (editForm) editForm.style.display = 'block';

    document.getElementById('editName').value = name;
    document.getElementById('editEmail').value = email;
    document.getElementById('editAddress').value = address === 'Not provided' ? '' : address;
    document.getElementById('editPhone').value = phone === 'Not provided' ? '' : phone;
    document.querySelectorAll('.error-message').forEach(error => error.textContent = '');
}

// Function to cancel edit
function cancelEdit() {
    const userView = document.getElementById('userView');
    const editForm = document.getElementById('editForm');
    if (userView) userView.style.display = 'block';
    if (editForm) editForm.style.display = 'none';
    document.querySelectorAll('.error-message').forEach(error => error.textContent = '');
}

// Function to validate form
function validateForm() {
    let isValid = true;
    const name = document.getElementById('editName');
    const email = document.getElementById('editEmail');
    const address = document.getElementById('editAddress');
    const phone = document.getElementById('editPhone');

    if (!name || !email || !address || !phone) return false;

    document.querySelectorAll('.error-message').forEach(error => error.textContent = '');

    if (name.value.trim().length < 2) {
        document.getElementById('nameError').textContent = 'Name must be at least 2 characters long';
        isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value)) {
        document.getElementById('emailError').textContent = 'Please enter a valid email address';
        isValid = false;
    }

    if (address.value.trim() && address.value.trim().length < 5) {
        document.getElementById('addressError').textContent = 'Address must be at least 5 characters long if provided';
        isValid = false;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (phone.value.trim() && !phoneRegex.test(phone.value)) {
        document.getElementById('phoneError').textContent = 'Please enter a valid 10-digit phone number if provided';
        isValid = false;
    }

    return isValid;
}

// Function to save user changes
async function saveUserChanges(event) {
    event.preventDefault();

    if (!validateForm()) return;

    const name = document.getElementById('editName').value;
    const address = document.getElementById('editAddress').value || null;
    const phone = document.getElementById('editPhone').value || null;

    try {
        const response = await fetch(`/admin/user/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name: name, user_phone: phone, user_address: address })
        });
        const data = await response.json();

        if (data.success) {
            document.getElementById('userName').textContent = name;
            document.getElementById('userAddress').textContent = address || 'Not provided';
            document.getElementById('userPhone').textContent = phone || 'Not provided';
            document.getElementById('userAvatar').textContent = name.charAt(0);
            cancelEdit();
            alert('User information updated successfully!');
        } else {
            alert('Failed to update user: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('An error occurred while updating user details.');
    }
}

// Function to delete user
async function deleteUser() {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/admin/user/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            alert('User deleted successfully!');
            goBack();
        } else {
            alert('Failed to delete user: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('An error occurred while deleting the user.');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userEditForm')?.addEventListener('submit', saveUserChanges);
    document.getElementById('edit-user-btn')?.addEventListener('click', showEditForm);
    document.getElementById('cancel-edit')?.addEventListener('click', cancelEdit);
    document.getElementById('delete-user-btn')?.addEventListener('click', deleteUser);
    fetchUserDetails();
});