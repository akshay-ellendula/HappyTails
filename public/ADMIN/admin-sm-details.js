       // Get URL parameters
       const urlParams = new URLSearchParams(window.location.search);
       const managerId = urlParams.get('id');
       
       // Function to go back to managers page
       function goBack() {
           window.location.href = "admin-shop-manager";
       }
       
       // Function to show edit form
       function showEditForm() {
           document.getElementById('managerView').style.display = 'none';
           document.getElementById('editForm').style.display = 'block';
           
           // Load current values into form
           document.getElementById('editName').value = document.getElementById('managerName').textContent;
           document.getElementById('editEmail').value = document.getElementById('managerEmail').textContent;
           document.getElementById('editDepartment').value = document.getElementById('department').textContent;
           document.getElementById('editPhone').value = document.getElementById('managerPhone').textContent;
           
           // Set status dropdown value
           const statusElement = document.getElementById('status').querySelector('span');
           if (statusElement) {
               document.getElementById('editStatus').value = statusElement.textContent;
           }
       }
       
       // Function to cancel edit
       function cancelEdit() {
           document.getElementById('managerView').style.display = 'block';
           document.getElementById('editForm').style.display = 'none';
       }
       
       // Function to save manager changes
       function saveManagerChanges() {
           // Get form values
           const name = document.getElementById('editName').value;
           const email = document.getElementById('editEmail').value;
           const department = document.getElementById('editDepartment').value;
           const phone = document.getElementById('editPhone').value;
           const status = document.getElementById('editStatus').value;
           
           // Validate inputs
           if (!name || !email || !department || !phone) {
               alert('Please fill in all required fields.');
               return;
           }
           
           // Update display
           document.getElementById('managerName').textContent = name;
           document.getElementById('managerEmail').textContent = email;
           document.getElementById('department').textContent = department;
           document.getElementById('managerPhone').textContent = phone;
           
           // Update avatar initial
           document.getElementById('managerAvatar').textContent = name.charAt(0);
           
           // Update status with appropriate class
           const statusClass = status === 'Active' ? 'status-active' : 'status-inactive';
           document.getElementById('status').innerHTML = `<span class="${statusClass}">${status}</span>`;
           
           // Return to view mode
           cancelEdit();
           
           // Show confirmation
           alert('Manager information updated successfully!');
       }

       function validateForm() {
        let isValid = true;
        const name = document.getElementById('editName');
        const email = document.getElementById('editEmail');
        const department = document.getElementById('editDepartment');
        const phone = document.getElementById('editPhone');
        const status = document.getElementById('editStatus');

        // Reset error messages
        document.querySelectorAll('.error-message').forEach(error => error.textContent = '');

        // Name validation
        if (name.value.trim().length < 2) {
            document.getElementById('nameError').textContent = 'Name must be at least 2 characters';
            isValid = false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value)) {
            document.getElementById('emailError').textContent = 'Please enter a valid email address';
            isValid = false;
        }

        // Department validation
        if (department.value.trim().length < 3) {
            document.getElementById('departmentError').textContent = 'Department must be at least 3 characters';
            isValid = false;
        }

        // Phone validation (Indian format: +91 followed by 10 digits starting with 6-9)
        const phoneRegex = /^\+91[6-9][0-9]{9}$/;
        if (!phoneRegex.test(phone.value)) {
            document.getElementById('phoneError').textContent = 'Enter valid Indian mobile number (+91XXXXXXXXXX)';
            isValid = false;
        }

        // Status validation
        if (!status.value) {
            document.getElementById('statusError').textContent = 'Please select a status';
            isValid = false;
        }

        return isValid;
    }

    // Form submission handler
    document.getElementById('managerEditForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (validateForm()) {
            saveManagerChanges();
        }
    });

    // Existing functions
    function showEditForm() {
        document.getElementById('managerView').style.display = 'none';
        document.getElementById('editForm').style.display = 'block';
    }

    function saveManagerChanges() {
        // Add your save logic here
        console.log('Saving manager changes...');
        document.getElementById('editForm').style.display = 'none';
        document.getElementById('managerView').style.display = 'block';
        // Update view with new values
        document.getElementById('managerName').textContent = document.getElementById('editName').value;
        document.getElementById('managerEmail').textContent = document.getElementById('editEmail').value;
        document.getElementById('department').textContent = document.getElementById('editDepartment').value;
        document.getElementById('managerPhone').textContent = document.getElementById('editPhone').value;
        document.getElementById('status').innerHTML = `<span class="status-${document.getElementById('editStatus').value.toLowerCase().replace(' ', '-')}">${document.getElementById('editStatus').value}</span>`;
    }

    function cancelEdit() {
        document.getElementById('editForm').style.display = 'none';
        document.getElementById('managerView').style.display = 'block';
    }
