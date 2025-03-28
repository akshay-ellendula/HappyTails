
document.addEventListener('DOMContentLoaded', function () {
    // Toggle functionality
    const signInToggle = document.getElementById('signInToggle');
    const signUpToggle = document.getElementById('signUpToggle');
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const forgotPasswordLink = document.querySelector('.forgot-password');

    // Toggle between Sign In and Sign Up
    signInToggle.addEventListener('click', () => {
        signInForm.classList.remove('hidden-form');
        signInForm.classList.add('active-form');
        signUpForm.classList.remove('active-form');
        signUpForm.classList.add('hidden-form');
        signInToggle.classList.add('active');
        signUpToggle.classList.remove('active');
        clearAlerts();
    });

    signUpToggle.addEventListener('click', () => {
        signUpForm.classList.remove('hidden-form');
        signUpForm.classList.add('active-form');
        signInForm.classList.remove('active-form');
        signInForm.classList.add('hidden-form');
        signUpToggle.classList.add('active');
        signInToggle.classList.remove('active');
        clearAlerts();
    });

    // Sign In Form Submission
    signInForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAlerts();

        const email = this.querySelector('input[name="user_email"]');
        const password = this.querySelector('input[name="user_password"]');
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

        if (!isValid) return;

        // AJAX request to backend
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: email.value.trim(),
                    user_password: password.value
                })
            });

            const data = await response.json();

            if (data.success) {
                showSuccess(this, data.message || 'Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = data.redirect || '/home';
                }, 2000);
            } else {
                showError(null, data.message || 'An error occurred during login');
            }
        } catch (error) {
            showError(null, 'Network error. Please try again later.');
            console.error('Login error:', error);
        }
    });

    // Sign Up Form Submission
    signUpForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAlerts();

        const name = this.querySelector('input[name="user_name"]');
        const email = this.querySelector('input[name="user_email"]');
        const password = this.querySelector('input[name="user_password"]');
        let isValid = true;

        // Client-side validation
        if (!name.value.trim()) {
            showError(name, 'Name is required');
            isValid = false;
        } else if (name.value.trim().length < 2) {
            showError(name, 'Name must be at least 2 characters');
            isValid = false;
        }

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

        if (!isValid) return;

        // AJAX request to backend
        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_name: name.value.trim(),
                    user_email: email.value.trim(),
                    user_password: password.value
                })
            });

            const data = await response.json();

            if (data.success) {
                showSuccess(this, data.message || 'Registration successful! Redirecting...');
            } else {
                showError(null, data.message || 'An error occurred during signup');
            }
        } catch (error) {
            showError(null, 'Network error. Please try again later.');
            console.error('Signup error:', error);
        }
    });

    // Forgot Password Functionality
    forgotPasswordLink.addEventListener('click', function (e) {
        e.preventDefault();
        clearAlerts();

        const email = signInForm.querySelector('input[name="user_email"]').value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError(signInForm.querySelector('input[name="user_email"]'), 'Please enter a valid email first');
            return;
        }

        // Simulate password reset (replace with actual backend call if implemented)
        const alert = document.createElement('div');
        alert.className = 'alert alert-warning';
        alert.textContent = 'Password reset link has been sent to your email.';
        signInForm.prepend(alert);
        setTimeout(() => {
            alert.classList.add('show');
        }, 10);
    });

    // Error Handling Functions
    function showError(input, message) {
        if (input) {
            input.classList.add('input-error', 'shake');
            const alert = document.createElement('div');
            alert.className = 'alert alert-error';
            alert.textContent = message;
            input.parentNode.insertBefore(alert, input.nextSibling);
            setTimeout(() => {
                alert.classList.add('show');
            }, 10);
            setTimeout(() => {
                input.classList.remove('shake');
            }, 500);
        } else {
            // Show general error at top of form
            const activeForm = document.querySelector('.active-form');
            const alert = document.createElement('div');
            alert.className = 'alert alert-error';
            alert.textContent = message;
            activeForm.prepend(alert);
            setTimeout(() => {
                alert.classList.add('show');
            }, 10);
        }
    }

    function showSuccess(form, message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.textContent = message;
        form.prepend(alert);
        setTimeout(() => {
            alert.classList.add('show');
        }, 10);
    }

    function clearAlerts() {
        document.querySelectorAll('.alert').forEach(alert => alert.remove());
        document.querySelectorAll('.input-error').forEach(input => {
            input.classList.remove('input-error');
        });
    }

    // Real-time Error Clearing
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', function () {
            this.classList.remove('input-error');
            const nextSibling = this.nextSibling;
            if (nextSibling && nextSibling.classList && nextSibling.classList.contains('alert')) {
                nextSibling.remove();
            }
        });
    });
});