   document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('login-form');
        
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                clearAlerts();
        
                const email = document.getElementById('email');
                const password = document.getElementById('password');
                const role = document.getElementById('role');
                let isValid = true;
        
                // Client-side validation
                if (!email.value.trim()) {
                    showError(email, 'Email is required');
                    isValid = false;
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
                    showError(email, 'Please enter a valid email address');
                    isValid = false;
                }
                if (!password.value) {
                    showError(password, 'Password is required');
                    isValid = false;
                } else if (password.value.length < 6) {
                    showError(password, 'Password must be at least 6 characters');
                    isValid = false;
                }
        
                if (!role.value) {
                    showError(role, 'Please select your role');
                    isValid = false;
                }
        
                if (!isValid) return;
        
                // Prepare form data
                const formData = {
                    email: email.value.trim(),
                    password: password.value,
                    role: role.value
                };
        
                try {
                    // Send AJAX request
                    const response = await fetch('/service_provider_login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    const data = await response.json();
                    if (data.success) {
                        showSuccess(data.message || 'Login successful! Redirecting...');
                        window.location.href = data.redirect;
                    } else {
                        if (data.message === 'Invalid email or password') {
                            showError(email, data.message);
                        } else {
                            showError(null, data.message || 'An error occurred. Please try again.');
                        }
                    }
                } catch (error) {
                    console.error('Client-side error:', error);
                    showError(null, 'An error occurred while logging in. Please try again.');
                }
            });
        
            // Error display function
            function showError(input, message) {
                if (input) {
                    input.classList.add('input-error', 'shake');
                    const alert = document.createElement('div');
                    alert.className = 'alert alert-error';
                    alert.textContent = message;
                    input.parentNode.insertBefore(alert, input.nextSibling);
                    setTimeout(() => alert.classList.add('show'), 10);
                    setTimeout(() => input.classList.remove('shake'), 500);
                } else {
                    const alert = document.createElement('div');
                    alert.className = 'alert alert-error';
                    alert.textContent = message;
                    form.prepend(alert);
                    setTimeout(() => alert.classList.add('show'), 10);
                }
            }
        
            // Success display function
            function showSuccess(message) {
                const alert = document.createElement('div');
                alert.className = 'alert alert-success';
                alert.textContent = message;
                form.prepend(alert);
                setTimeout(() => alert.classList.add('show'), 10);
            }
        
            // Clear alerts function
            function clearAlerts() {
                document.querySelectorAll('.alert').forEach(alert => alert.remove());
                document.querySelectorAll('.input-error').forEach(input => input.classList.remove('input-error'));
            }
        
            // Clear errors on input
            document.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('input', function() {
                    this.classList.remove('input-error');
                    const nextSibling = this.nextSibling;
                    if (nextSibling && nextSibling.classList && nextSibling.classList.contains('alert')) {
                        nextSibling.remove();
                    }
                });
            });
        
            // Forgot password (placeholder)
            document.querySelector('.forgot-password').addEventListener('click', function(e) {
                e.preventDefault();
                clearAlerts();
                const alert = document.createElement('div');
                alert.className = 'alert alert-warning';
                alert.textContent = 'Password reset link has been sent to your email.';
                form.prepend(alert);
                setTimeout(() => alert.classList.add('show'), 10);
            });
        });