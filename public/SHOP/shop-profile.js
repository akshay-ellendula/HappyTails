

document.addEventListener('DOMContentLoaded', function() {
    const profileView = document.getElementById('profile-view');
    const profileEdit = document.getElementById('profile-edit');
    const editBtn = document.getElementById('edit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveBtn = document.getElementById('save-btn');
    
    // Show edit form
    editBtn.addEventListener('click', function() {
        profileView.classList.add('hidden');
        profileEdit.classList.remove('hidden');
    });
    
    // Cancel editing
    cancelBtn.addEventListener('click', function() {
        profileView.classList.remove('hidden');
        profileEdit.classList.add('hidden');
    });
    
    // Save changes
    saveBtn.addEventListener('click', function() {
        // Get updated values from form
        const storeName = document.getElementById('store-name').value;
        const ownerName = document.getElementById('owner-name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const address = document.getElementById('address').value;
        const description = document.getElementById('description').value;
        

        const fields = profileView.querySelectorAll('p');
        fields[0].textContent = storeName;
        fields[1].textContent = ownerName;
        fields[2].textContent = email;
        fields[3].textContent = phone;
        fields[4].textContent = address;
        fields[5].textContent = description;
        
        // Switch back to view mode
        profileView.classList.remove('hidden');
        profileEdit.classList.add('hidden');
    });
});