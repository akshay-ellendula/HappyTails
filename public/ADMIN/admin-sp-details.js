
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
        
        
        