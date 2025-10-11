document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("editProfilePic");
    const form = document.getElementById("editProfileForm");

    // --- File name display ---
    if (fileInput) {
        fileInput.addEventListener("change", function () {
        const fileName = this.files[0] ? this.files[0].name : "No file chosen";
        this.nextElementSibling.nextElementSibling.textContent = fileName;
        });
    }

    // --- Form Validation on Submit ---
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const firstName = document.getElementById("editFirstName").value.trim();
        const lastName = document.getElementById("editLastName").value.trim();
        const email = document.getElementById("editEmail").value.trim();
        const phone = document.getElementById("editPhone").value.trim();
        const eventType = document.getElementById("editEventType").value.trim();
        const license = document.getElementById("editLicense").value.trim();
        const bio = document.getElementById("editBio").value.trim();
        const profilePic = document.getElementById("editProfilePic").files[0];

        // 1️⃣ Validate all required fields
        if (!firstName || !lastName || !email || !phone || !eventType || !license || !bio) {
        alert("⚠️ Please fill out all required fields before saving changes.");
        return;
        }

        // 2️⃣ Validate email format
        const emailPattern = /^[^\s@]+@gmail\.com$/;
        if (!emailPattern.test(email)) {
        alert("⚠️ Please enter a valid Gmail address.");
        return;
        }


        // 3️⃣ Validate phone number (10 digits)
        const phonePattern = /^[0-9]{10}$/;
        if (!phonePattern.test(phone)) {
        alert("⚠️ Phone number must be exactly 10 digits.");
        return;
        }

        // 4️⃣ Validate license (alphanumeric, at least 5 chars)
        const licensePattern =/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!licensePattern.test(license)) {
        alert("⚠️ License number must be at least 5 characters (letters/numbers).");
        return;
        }

        // 5️⃣ Validate profile image type (if uploaded)
        if (profilePic) {
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
        if (!allowedTypes.includes(profilePic.type)) {
            alert("⚠️ Please upload a valid image (JPEG, PNG, JPG, or WEBP).");
            return;
        }
        }

        // ✅ Build FormData for submission
        const formData = new FormData();
        formData.append("firstName", firstName);
        formData.append("lastName", lastName);
        formData.append("email", email);
        formData.append("phone", phone);
        formData.append("eventType", eventType);
        formData.append("license", license);
        formData.append("bio", bio);
        if (profilePic) formData.append("profilePic", profilePic);

        try {
        const response = await fetch("/eventmanager_profile", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert("🎉 Profile updated successfully!");
            window.location.reload();
        } else {
            alert("❌ Failed to update profile: " + (result.message || "Unknown error"));
        }
        } catch (error) {
        console.error("Error updating profile:", error);
        alert("⚠️ Network or server error while updating profile.");
        }
    });
    });

    // --- Modal Controls ---
    window.openEditProfile = () => {
    document.getElementById("editProfileModal").style.display = "block";
    };
    window.closeEditProfile = () => {
    document.getElementById("editProfileModal").style.display = "none";
    };

    // --- Password Update Section ---
    window.updatePassword = async () => {
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword) {
        alert("Please enter your current password");
        return;
    }

    if (!validatePassword(newPassword)) {
        alert("Your new password does not meet the requirements");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("New password and confirm password do not match");
        return;
    }

    try {
        const response = await fetch("/eventmanager_profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await response.json();
        if (data.success) {
        alert("✅ Password updated successfully!");
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        } else {
        alert(data.message || "Failed to update password");
        }
    } catch (err) {
        console.error("Error updating password:", err);
        alert("⚠️ An error occurred while updating the password");
    }
    };

    // --- Password Strength Validation ---
    function validatePassword(password) {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /\d/.test(password) &&
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    );
    }