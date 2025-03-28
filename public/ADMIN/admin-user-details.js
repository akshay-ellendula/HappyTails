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
            document.getElementById('userAvatar').textContent = user.name.charAt(0);
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('userId').textContent = `#USR${String(user.id).padStart(3, '0')}`;
            document.getElementById('joinedDate').textContent = new Date(user.joined_date).toLocaleDateString();
            document.getElementById('userAddress').textContent = user.address || 'Not provided';
            document.getElementById('userPhone').textContent = user.phone || 'Not provided';
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
    document.getElementById('userView').style.display = 'none';
    document.getElementById('editForm').style.display = 'block';

    // Load current values into form
    document.getElementById('editName').value = document.getElementById('userName').textContent;
    document.getElementById('editEmail').value = document.getElementById('userEmail').textContent;
    document.getElementById('editAddress').value = document.getElementById('userAddress').textContent === 'Not provided' ? '' : document.getElementById('userAddress').textContent;
    document.getElementById('editPhone').value = document.getElementById('userPhone').textContent === 'Not provided' ? '' : document.getElementById('userPhone').textContent;
}

// Function to cancel edit
function cancelEdit() {
    document.getElementById('userView').style.display = 'block';
    document.getElementById('editForm').style.display = 'none';
    document.querySelectorAll('.error-message').forEach(error => error.textContent = '');
}

// Function to validate form
function validateForm() {
    let isValid = true;
    const name = document.getElementById('editName');
    const email = document.getElementById('editEmail');
    const address = document.getElementById('editAddress');
    const phone = document.getElementById('editPhone');

    // Reset error messages
    document.querySelectorAll('.error-message').forEach(error => error.textContent = '');

    // Name validation
    if (name.value.trim().length < 2) {
        document.getElementById('nameError').textContent = 'Name must be at least 2 characters long';
        isValid = false;
    }

    // Email validation (not editable, but included for completeness)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value)) {
        document.getElementById('emailError').textContent = 'Please enter a valid email address';
        isValid = false;
    }

    // Address validation
    if (address.value.trim() && address.value.trim().length < 5) {
        document.getElementById('addressError').textContent = 'Address must be at least 5 characters long if provided';
        isValid = false;
    }

    // Phone validation
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
            // Update display
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

// Event listener for form submission
document.getElementById('userEditForm').addEventListener('submit', saveUserChanges);

// Load user details on page load
window.onload = fetchUserDetails;