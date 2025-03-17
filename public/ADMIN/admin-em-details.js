
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const managerId = urlParams.get('id');
        
        // Function to go back to managers page
        function goBack() {
            window.location.href = "admin-events";
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
            alert('Event manager information updated successfully!');
        }
        