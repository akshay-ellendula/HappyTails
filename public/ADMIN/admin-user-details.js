     // Get URL parameters
     const urlParams = new URLSearchParams(window.location.search);
     const userId = urlParams.get('id');

     // Function to go back to users page
     function goBack() {
         window.location.href = "admin-user";
     }

     // Function to show edit form
     function showEditForm() {
         document.getElementById('userView').style.display = 'none';
         document.getElementById('editForm').style.display = 'block';
         
         // Load current values into form
         document.getElementById('editName').value = document.getElementById('userName').textContent;
         document.getElementById('editEmail').value = document.getElementById('userEmail').textContent;
         document.getElementById('editAddress').value = document.getElementById('userAddress').textContent;
         document.getElementById('editPhone').value = document.getElementById('userPhone').textContent;
     }

     // Function to cancel edit
     function cancelEdit() {
         document.getElementById('userView').style.display = 'block';
         document.getElementById('editForm').style.display = 'none';
     }

     // Function to save user changes
     function saveUserChanges() {
         // Get form values
         const name = document.getElementById('editName').value;
         const email = document.getElementById('editEmail').value;
         const address = document.getElementById('editAddress').value;
         const phone = document.getElementById('editPhone').value;
         
         // Update display
         document.getElementById('userName').textContent = name;
         document.getElementById('userEmail').textContent = email;
         document.getElementById('userAddress').textContent = address;
         document.getElementById('userPhone').textContent = phone;
         
         // Update avatar initial
         document.getElementById('userAvatar').textContent = name.charAt(0);
         
         // Return to view mode
         cancelEdit();
         
         // Show confirmation
         alert('User information updated successfully!');
     }

   
  