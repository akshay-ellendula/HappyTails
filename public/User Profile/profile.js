const editButton = document.getElementById('editButton');
const saveButton = document.getElementById('saveButton');
const spans = document.querySelectorAll('span');
const inputs = document.querySelectorAll('input');
const changePicText = document.querySelector('.change_pic_text');
const hiddenInput = document.getElementById('user_photo_button');
const dottedCircle = document.querySelector('.dotted_circle');
const profilePicContainer = document.querySelector(".profile_pic");
const profilePic = document.querySelector(".profile_pic img");
const changePic = document.querySelector('.change_pic'); 

const previewImage = document.createElement('img'); 
previewImage.style.maxWidth = "100%";
previewImage.style.maxHeight = "100%";
previewImage.style.borderRadius = "50%";
let selectedImageSrc = null; 

// Enter edit mode
editButton.addEventListener('click', () => {
    spans.forEach(span => span.style.display = 'none');
    inputs.forEach(input => input.style.display = 'block');
    hiddenInput.style.display = 'none';
    editButton.style.display = 'none';
    saveButton.style.display = 'inline-block';
    changePic.classList.add('edit-mode');

    // Hide profile pic and show dotted circle
    profilePicContainer.style.display = 'none';
    dottedCircle.style.display = 'flex';
});

// Click to upload image
changePic.addEventListener('click', () => {
    if (changePic.classList.contains('edit-mode')) {
        hiddenInput.click(); // Triggers the file input
    }
});

// Handle image upload
hiddenInput.addEventListener('change', () => {
    const image = hiddenInput.files[0];
    if (image) {
        const reader = new FileReader();
        reader.onload = () => {
            selectedImageSrc = reader.result; // Store image preview
            previewImage.src = selectedImageSrc; 
            dottedCircle.innerHTML = '<input type="file" id="user_photo_button" accept="image/*" hidden>';
            dottedCircle.appendChild(previewImage); // Show preview inside dotted circle
        };
        reader.readAsDataURL(image);
    }
});

// Show "Change Photo" text on hover in edit mode
changePic.addEventListener('mouseover', () => {
    if (changePic.classList.contains('edit-mode')) {
        changePicText.style.display = 'block';
    }
});

changePic.addEventListener('mouseout', () => {
    changePicText.style.display = 'none';
});

// for Phone Number Validation
const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', (event) => {
    // Remove all non-digits and limit to 10 characters
    let { value } = event.target;
    value = value.replace(/\D/g, '').slice(0, 10);
    event.target.value = value;
});

// Form submission handler
document.getElementById("editProfileForm").addEventListener("submit", function (event) {
    event.preventDefault();

    // Check phone number length and starting digit before submission
    const phoneNumber = phoneInput.value;
    const validStartDigits = ['9', '8', '7', '6'];

    if (phoneNumber.length !== 10 || !validStartDigits.includes(phoneNumber[0])) {
        alert('Please enter a valid 10-digit Indian phone number starting with 9, 8, 7, or 6.');
        return; // Stop the form submission
    }
    
    const formData = new FormData(this);
    
    // Add profile picture if one was selected
    if (selectedImageSrc) {
        fetch(selectedImageSrc)
            .then(res => res.blob())
            .then(blob => {
                formData.append("profilePic", blob, "profile.jpg");
                submitForm(formData);
            })
            .catch(error => {
                console.error("Error with image processing:", error);
                submitForm(formData); // Continue without the image
            });
    } else {
        submitForm(formData);
    }
    
    function submitForm(formData) {
        fetch("/update-profile", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Profile updated successfully!");
                window.location.reload(); // Refresh page to show updated data
            } else {
                alert("Error updating profile: " + (data.error || "Unknown error"));
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Network error. Please try again.");
        });
    }
});

// Sidebar toggle functions
document.getElementById('menuIcon').addEventListener('click', function() {
    document.getElementById('sideNavbar').classList.toggle('open');
});

document.getElementById('closeBtn').addEventListener('click', function() {
    document.getElementById('sideNavbar').classList.remove('open');
});

document.getElementById('sidebar_btn').addEventListener('click', function() {
    document.querySelector('.mobile_sidebar').classList.toggle('open');
});

document.querySelector('#mobile_sidebar_close-btn').addEventListener('click', function() {
    document.querySelector('.mobile_sidebar').classList.remove('open');
});