function togglePetDetails(show) {
    const petDetails = document.getElementById('pet-details');
    petDetails.style.display = show ? 'block' : 'none';

    // Reset pet details fields when hidden
    if (!show) {
        document.getElementById('pet_name').value = '';
        document.getElementById('pet_breed').value = '';
        document.getElementById('pet_dob').value = '';
    }
}

// Attach event listeners for navbar
document.getElementById('menuIcon').addEventListener('click', function() {
    document.getElementById('sideNavbar').classList.toggle('open');
});

document.getElementById('closeBtn').addEventListener('click', function() {
    document.getElementById('sideNavbar').classList.remove('open');
});

document.querySelectorAll('.side-navbar a:not(.close-btn)').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('sideNavbar').classList.remove('open');
    });
});


