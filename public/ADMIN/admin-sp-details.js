
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const providerId = urlParams.get('id');
        
        // Function to go back to providers page
        function goBack() {
            window.location.href = "admin-service-provider";
        }
        
        // Function to show edit form
        function showEditForm() {
            document.getElementById('providerView').style.display = 'none';
            document.getElementById('editForm').style.display = 'block';
            
            // Load current values into form
            document.getElementById('editName').value = document.getElementById('providerName').textContent;
            document.getElementById('editEmail').value = document.getElementById('providerEmail').textContent;
            document.getElementById('editAddress').value = document.getElementById('providerAddress').textContent;
            document.getElementById('editPhone').value = document.getElementById('providerPhone').textContent;
            document.getElementById('editServices').value = document.getElementById('servicesOffered').textContent;
            document.getElementById('editAvailability').value = document.getElementById('availability').textContent;
            document.getElementById('editLicense').value = document.getElementById('licenseNumber').textContent;
        }
        
        // Function to cancel edit
        function cancelEdit() {
            document.getElementById('providerView').style.display = 'block';
            document.getElementById('editForm').style.display = 'none';
        }
        
        // Function to save provider changes
        function saveProviderChanges() {
            // Get form values
            const name = document.getElementById('editName').value;
            const category = document.getElementById('editCategory').value;
            const email = document.getElementById('editEmail').value;
            const address = document.getElementById('editAddress').value;
            const phone = document.getElementById('editPhone').value;
            const services = document.getElementById('editServices').value;
            const availability = document.getElementById('editAvailability').value;
            const license = document.getElementById('editLicense').value;
            
            // Update display
            document.getElementById('providerName').textContent = name;
            document.getElementById('providerCategory').innerHTML = category + ' <span class="verified-badge">Verified</span>';
            document.getElementById('providerEmail').textContent = email;
            document.getElementById('providerAddress').textContent = address;
            document.getElementById('providerPhone').textContent = phone;
            document.getElementById('servicesOffered').textContent = services;
            document.getElementById('availability').textContent = availability;
            document.getElementById('licenseNumber').textContent = license;
            
            // Update avatar initial
            document.getElementById('providerAvatar').textContent = name.charAt(0);
            
            // Return to view mode
            cancelEdit();
            
            // Show confirmation
            alert('Provider information updated successfully!');
        }
        
        
        
        function validateForm() {
            let isValid = true;
            const name = document.getElementById('editName');
            const category = document.getElementById('editCategory');
            const email = document.getElementById('editEmail');
            const address = document.getElementById('editAddress');
            const phone = document.getElementById('editPhone');
            const services = document.getElementById('editServices');
            const availability = document.getElementById('editAvailability');
            const license = document.getElementById('editLicense');
            const expiration = document.getElementById('editExpiration');

            // Reset error messages
            document.querySelectorAll('.error-message').forEach(error => error.textContent = '');

            // Name validation
            if (name.value.trim().length < 2) {
                document.getElementById('nameError').textContent = 'Name must be at least 2 characters';
                isValid = false;
            }

            // Category validation
            if (!category.value) {
                document.getElementById('categoryError').textContent = 'Please select a category';
                isValid = false;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.value)) {
                document.getElementById('emailError').textContent = 'Please enter a valid email address';
                isValid = false;
            }

            // Address validation (Indian format)
            if (address.value.trim().length < 15) {
                document.getElementById('addressError').textContent = 'Please enter complete address including city and PIN (min 15 chars)';
                isValid = false;
            }
            const pinCodeRegex = /\b\d{6}\b/;
            if (!pinCodeRegex.test(address.value)) {
                document.getElementById('addressError').textContent = 'Address must include a valid 6-digit PIN code';
                isValid = false;
            }

            // Phone validation (Indian format: +91 followed by 10 digits starting with 6-9)
            const phoneRegex = /^\+91[6-9][0-9]{9}$/;
            if (!phoneRegex.test(phone.value)) {
                document.getElementById('phoneError').textContent = 'Enter valid Indian mobile number (+91XXXXXXXXXX)';
                isValid = false;
            }

            // Services validation
            if (services.value.trim().length < 10) {
                document.getElementById('servicesError').textContent = 'Please provide detailed services (min 10 characters)';
                isValid = false;
            }

            // Availability validation
            if (availability.value.trim().length < 5) {
                document.getElementById('availabilityError').textContent = 'Please specify availability (min 5 characters)';
                isValid = false;
            }

            // License validation (Indian format: ST-VET-XXXXX)
            const licenseRegex = /^[A-Z]{2}-[A-Z]{3}-[0-9]{5}$/;
            if (!licenseRegex.test(license.value)) {
                document.getElementById('licenseError').textContent = 'License format: XX-XXX-XXXXX (e.g., KA-VET-12345)';
                isValid = false;
            }

            // Expiration date validation
            const today = new Date('2025-03-17');
            const expDate = new Date(expiration.value);
            if (expDate <= today) {
                document.getElementById('expirationError').textContent = 'Expiration date must be in the future';
                isValid = false;
            }

            return isValid;
        }

        // Form submission handler
        document.getElementById('providerEditForm').addEventListener('submit', function (e) {
            e.preventDefault();
            if (validateForm()) {
                saveProviderChanges();
            }
        });

        // Existing functions
        function showEditForm() {
            document.getElementById('providerView').style.display = 'none';
            document.getElementById('editForm').style.display = 'block';
        }

        function saveProviderChanges() {
            document.getElementById('editForm').style.display = 'none';
            document.getElementById('providerView').style.display = 'block';
        }

        function cancelEdit() {
            document.getElementById('editForm').style.display = 'none';
            document.getElementById('providerView').style.display = 'block';
        }