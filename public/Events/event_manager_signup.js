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
                if (name.length < 2) {
                    showError('name', 'Name must be at least 2 characters long');
                    isValid = false;
                }
                // Contact number validation
                const phoneRegex = /^\d{10}$/;
                if (!phoneRegex.test(contactnumber)) {
                    showError('contactnumber', 'Please enter a valid 10-digit phone number');
                    isValid = false;
                }
                // Email validation
                const emailRegex = /^[^\s@]+@gmail\.com$/;
                if (!emailRegex.test(email)) {
                    showError('email', 'Please enter a valid email address');
                    isValid = false;
                }
                // Password validation
                const passwordRegex = /^(?=.*\d).{6,}$/;
                if (!passwordRegex.test(password)) {
                    showError('password', 'Password must be at least 6 characters long and contain a number');
                    isValid = false;
                }
                // Confirm password validation
                if (password !== confirmpassword) {
                    showError('confirmpassword', 'Passwords do not match');
                    isValid = false;
                }
                // Company name validation
                if (companyname.length < 2) {
                    showError('companyname', 'Company name must be at least 2 characters long');
                    isValid = false;
                }
                // Location validation
                if (location.length < 3) {
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