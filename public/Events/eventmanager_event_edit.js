
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('editEventForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // --- Get input references ---
    const name = document.getElementById('name');
    const about = document.getElementById('about');
    const language = document.getElementById('language');
    const duration = document.getElementById('duration');
    const ticketPrice = document.getElementById('ticket_price');
    const ageLimit = document.getElementById('age_limit');
    const venue = document.getElementById('venue');
    const city = document.getElementById('city');
    const contact = document.getElementById('contact');
    const instructions = document.getElementById('instructions');
    const terms = document.getElementById('terms');
    const category = document.getElementById('category');
    const date = document.getElementById('date');
    const time = document.getElementById('time');
    const totalTickets = document.getElementById('total_tickets');
    const eventImageUpload = document.getElementById('eventImageUpload');

    // --- 1️⃣ Check required fields ---
    const requiredFields = [
      name, about, language, duration, ticketPrice, ageLimit,
      venue, city, contact, instructions, terms, category, date, time, totalTickets
    ];

    for (let field of requiredFields) {
      if (!field.value.trim()) {
        alert(`⚠️ Please fill out the ${field.id.replace('_', ' ')} field.`);
        field.focus();
        return;
      }
    }

    // --- 2️⃣ Validate duration format (e.g. “2h”, “1.5h”) ---
    const durationPattern = /^[0-9]+(\.[0-9]+)?h$/;
    if (!durationPattern.test(duration.value.trim())) {
      alert("⚠️ Duration should be in format like '2h' or '1.5h'.");
      duration.focus();
      return;
    }

    // --- 3️⃣ Validate ticket price ---
    const price = parseFloat(ticketPrice.value);
    if (isNaN(price) || price <= 0) {
      alert("⚠️ Ticket price must be a positive number.");
      ticketPrice.focus();
      return;
    }

    // --- 4️⃣ Validate age limit ---
    const age = parseInt(ageLimit.value);
    if (isNaN(age) || age < 0) {
      alert("⚠️ Age limit must be a valid non-negative number.");
      ageLimit.focus();
      return;
    }

    // --- 5️⃣ Validate contact number ---
    const contactPattern = /^[0-9]{10}$/;
    if (!contactPattern.test(contact.value.trim())) {
      alert("⚠️ Please enter a valid 10-digit contact number.");
      contact.focus();
      return;
    }

    // // --- 6️⃣ Validate date and time (must be in future) ---
    // const selectedDateTime = new Date(`${date.value}T${time.value}`);
    // const now = new Date();
    // if (selectedDateTime <= now) {
    //   alert("⚠️ Please select a future date and time for your event.");
    //   date.focus();
    //   return;
    // }

    // --- 7️⃣ Validate total capacity (must be >= tickets sold) ---
    const capacity = parseInt(totalTickets.value);
    const ticketsSold = parseInt(document.querySelector('input[placeholder="Tickets sold"]').value) || 0;

    if (isNaN(capacity) || capacity <= 0) {
    alert("⚠️ Capacity must be a positive number.");
    totalTickets.focus();
    return;
    }

    if (capacity < ticketsSold) {
    alert(`⚠️ Capacity cannot be less than tickets already sold (${ticketsSold}).`);
    totalTickets.focus();
    return;
    }



    // --- 8️⃣ Validate uploaded image (optional) ---
    if (eventImageUpload.files.length > 0) {
      const file = eventImageUpload.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        alert("⚠️ Please upload a valid image (JPEG, PNG, JPG, or WEBP).");
        eventImageUpload.focus();
        return;
      }
    }

    // --- ✅ All validations passed ---
    if (confirm("✅ Save changes to this event?")) {
      form.submit(); // Proceed with form submission
    }
  });

  // --- Image preview (already present in your code) ---
  const eventImageUpload = document.getElementById('eventImageUpload');
  const imagePreview = document.getElementById('imagePreview');
  const currentImage = document.getElementById('currentImage');
  
  if (eventImageUpload) {
    eventImageUpload.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          imagePreview.src = e.target.result;
          imagePreview.style.display = 'block';
          if (currentImage && currentImage.tagName === 'IMG') {
            currentImage.style.display = 'none';
          } else if (currentImage && currentImage.classList.contains('image-placeholder')) {
            currentImage.style.display = 'none';
          }
        };
        reader.readAsDataURL(file);
      } else {
        imagePreview.style.display = 'none';
        if (currentImage) currentImage.style.display = '';
      }
    });
  }
});