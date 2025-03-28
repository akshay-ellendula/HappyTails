document.addEventListener("DOMContentLoaded", function () {
    const profileView = document.getElementById("profile-view");
    const profileEdit = document.getElementById("profile-edit");
    const editBtn = document.getElementById("edit-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const saveBtn = document.getElementById("save-btn");

    const form = document.getElementById("profile-form");
    const phoneInput = document.getElementById("phone");
    const emailInput = document.getElementById("email");

    // Show edit form
    editBtn.addEventListener("click", function () {
        profileView.classList.add("hidden");
        profileEdit.classList.remove("hidden");
    });

    // Cancel editing
    cancelBtn.addEventListener("click", function () {
        profileView.classList.remove("hidden");
        profileEdit.classList.add("hidden");
    });

    // Validation for phone number (10 digits)
    phoneInput.addEventListener("input", function () {
        if (!/^\d{10}$/.test(this.value)) {
            this.setCustomValidity("Phone number must be exactly 10 digits.");
        } else {
            this.setCustomValidity("");
        }
        this.reportValidity();
    });

    // Validation for email format
    emailInput.addEventListener("input", function () {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(this.value)) {
            this.setCustomValidity("Please enter a valid email address.");
        } else {
            this.setCustomValidity("");
        }
        this.reportValidity();
    });

    // Prevent save if validation fails
    saveBtn.addEventListener("click", function (event) {
        if (!phoneInput.checkValidity() || !emailInput.checkValidity()) {
            event.preventDefault(); // Stop form submission
            return; // Stop execution before updating the UI
        }

        // If valid, update profile view and switch back
        document.querySelector("#profile-view .profile-field:nth-child(3) p").textContent = emailInput.value;
        document.querySelector("#profile-view .profile-field:nth-child(4) p").textContent = phoneInput.value;

        profileView.classList.remove("hidden");
        profileEdit.classList.add("hidden");
    });
});
