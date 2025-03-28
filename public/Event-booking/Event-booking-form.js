// Event-booking/Event-booking-form.js
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("eventBookingForm");
  const phoneInput = document.getElementById("phone_number");
  const emailInput = document.getElementById("email");

  if (form) {
      form.addEventListener("submit", async function (event) {
          event.preventDefault(); // Prevent default form submission

          let isValid = true;

          // Contact Number validation (10 digits)
          const contactRegex = /^\d{10}$/;
          if (!contactRegex.test(phoneInput.value.trim())) {
              alert("Please enter a valid 10-digit contact number.");
              isValid = false;
          }

          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailInput.value.trim())) {
              alert("Please enter a valid email address.");
              isValid = false;
          }

          if (!isValid) {
              return;
          }

          const formData = {
              eventId: document.querySelector('input[name="eventId"]').value,
              name: document.getElementById('name').value,
              email: emailInput.value,
              phone_number: phoneInput.value,
              address: document.getElementById('address').value,
              seats: document.getElementById('seats').value,
              with_pet: document.querySelector('input[name="with_pet"]:checked').value,
              pet_name: document.getElementById('pet_name').value || null,
              pet_breed: document.getElementById('pet_breed').value || null,
              pet_dob: document.getElementById('pet_dob').value || null
          };

          console.log('Form data sent:', formData);

          try {
              const response = await fetch('/event_booking', { // Changed to match POST route
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(formData)
              });

              const result = await response.json();
              if (result.success) {
                  alert('Registration successful!');
                  window.location.href = '/Events';
              } else {
                  alert('Registration failed: ' + result.message);
                  if (response.status === 401) {
                      window.location.href = '/my_login';
                  }
              }
          } catch (error) {
              console.error('Error submitting form:', error);
              alert('An error occurred. Please try again.');
          }
      });
  }
});

function togglePetDetails(showPet) {
  const petDetails = document.getElementById("pet-details");
  petDetails.style.display = showPet ? "block" : "none";
  if (!showPet) {
      document.getElementById('pet_name').value = '';
      document.getElementById('pet_breed').value = '';
      document.getElementById('pet_dob').value = '';
  }
}