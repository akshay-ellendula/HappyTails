document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".container");
  const contactInput = document.getElementById("contactnumber");
  const emailInput = document.getElementById("email");

  form.addEventListener("submit", function (event) {
      let isValid = true;

      // Contact Number validation (10 digits)
      const contactRegex = /^\d{10}$/;
      if (!contactRegex.test(contactInput.value.trim())) {
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
          event.preventDefault(); // Prevent form submission if validation fails
      }
  });
});

// Toggle pet details visibility
function togglePetDetails(show) {
  document.getElementById("pet-details").style.display = show ? "block" : "none";
}
