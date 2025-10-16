document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('signupForm');
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                clearMessages();
                // Get form values
                const name = document.getElementById('name').value.trim();
                const contactnumber = document.getElementById('contactnumber').value.trim();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                const confirmpassword = document.getElementById('confirmpassword').value;
                const companyname = document.getElementById('companyname').value.trim();
                const location = document.getElementById('location').value.trim();
                const termsandconditions = document.getElementById('tac').checked;
                // Validation flags
                let isValid = true;
                // Name validation
                const nameRegex = /^[a-zA-Z]+$/;              
                if (name.length < 2) {
                    showError('name', 'Name must be at least 2 characters long');
                    isValid = false;
                } else if (!nameRegex.test(name)) {
                    showError('name', 'Name can only contain alphabets');
                    isValid = false;
                }
                // Contact number validation
                const phoneRegex = /^[6789]\d{9}$/;
                if (!phoneRegex.test(contactnumber)) {
                    showError('contactnumber', 'Please enter a valid 10-digit phone number starting with 6, 7, 8, or 9');
                    isValid = false;
                }
                // Email validation
                const emailRegex = /^[a-zA-Z0-9]+@gmail\.com$/;
                if (!emailRegex.test(email)) {
                    showError('email', 'Please enter a valid email address');
                    isValid = false;
                }
                function validatePassword(password) {
                return (
                    password.length >= 8 &&
                    /[A-Z]/.test(password) && // Checks for at least one uppercase letter
                    /\d/.test(password) &&    // Checks for at least one number
                    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) // Checks for at least one special character
                );
                }
                // --- In your main validation logic ---
                if (!validatePassword(password)) {
                    showError('password', 'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.');
                    isValid = false;
                }
                // Confirm password validation
                if (password !== confirmpassword) {
                    showError('confirmpassword', 'Passwords do not match');
                    isValid = false;
                }
                // Company name validation
                if (companyname.length < 3) {
                    showError('companyName', 'Company name must be at least 2 characters long');
                    isValid = false;
                }
                const trimmedLocation = location.trim();
                // Location validation
                if (trimmedLocation.length < 3) {
                    showError('location', 'Please enter a valid location (minimum 3 characters)');
                    isValid = false;
                }
                // Terms and conditions validation
                if (!termsandconditions) {
                    showError('terms', 'You must agree to the terms and conditions');
                    isValid = false;
                }
                // If validation fails, stop here
                if (!isValid) return;
                // Prepare form data for AJAX request
                const formData = {
                    name,
                    contactnumber,
                    email,
                    password,
                    confirmpassword,
                    companyname,
                    location,
                    termsandconditions
                };
                // Send AJAX request to the backend
                fetch('/eventManagerSignup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showGeneralMessage('general-success', data.message || 'Signup successful! Redirecting...');
                        setTimeout(() => {
                            window.location.href = data.redirect || '/event-dashboard';
                        }, 2000);
                    } else {
                        if (data.errors) {
                            // Display field-specific errors
                            data.errors.forEach(error => {
                                const errorDiv = document.getElementById(`${error.field}Error`);
                                if (errorDiv) {
                                    errorDiv.textContent = error.message;
                                    errorDiv.style.display = 'block';
                                }
                            });
                        }
                        showGeneralMessage('general-error', data.message || 'An error occurred. Please try again.');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showGeneralMessage('general-error', 'An error occurred while signing up. Please try again.');
                });
            });
            // Show field-specific error
            function showError(field, message) {
                const errorDiv = document.getElementById(`${field}Error`);
                if (errorDiv) {
                    errorDiv.textContent = message;
                    errorDiv.style.display = 'block';
                }
            }
            // Show general success/error message
            function showGeneralMessage(className, message) {
                const generalMessage = document.getElementById('generalMessage');
                generalMessage.className = `general-message ${className}`;
                generalMessage.textContent = message;
                generalMessage.style.display = 'block';
            }
            // Clear all messages
            function clearMessages() {
                document.querySelectorAll('.error').forEach(error => {
                    error.textContent = '';
                    error.style.display = 'none';
                });
                const generalMessage = document.getElementById('generalMessage');
                generalMessage.style.display = 'none';
                generalMessage.textContent = '';
            }
            // Clear field-specific errors on input
            document.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('input', function() {
                    const errorDiv = document.getElementById(`${this.id}Error`);
                    if (errorDiv) {
                        errorDiv.textContent = '';
                        errorDiv.style.display = 'none';
                    }
                });
            });
        });