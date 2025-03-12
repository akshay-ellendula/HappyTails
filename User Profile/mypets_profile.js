function selectButton(button, inputId, value) {
    document.getElementById(inputId).value = value;
    let buttons = button.parentElement.querySelectorAll("button");
    buttons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
}

function addPet() {
    document.querySelector(".container").classList.remove("hidden");
    document.querySelector(".pets_container").classList.add("hidden");
}

function cancel() {
    document.querySelector(".container").classList.add("hidden");
    document.querySelector(".pets_container").classList.remove("hidden");
}

document.getElementById("petForm").addEventListener("submit", function(event) {
    let requiredHiddenInputs = [
        "pet_type", "pet_gender", "pet_size", "pet_aggression", 
        "pet_vaccinated", "pet_neutered", "pet_sociable", "pet_potty_trained"
    ];
        
    let missingFields = [];
        
    // Check if required hidden inputs are filled
    for (let i = 0; i < requiredHiddenInputs.length; i++) {
        let input = document.getElementById(requiredHiddenInputs[i]);
        if (!input.value) {
            missingFields.push(input.name.replace("_", " "));
        }
    }

    let petImageInput = document.querySelector("input[name='pet_image']");
    if (!petImageInput.files || petImageInput.files.length === 0) {
        missingFields.push("pet image");
    }



    if (missingFields.length > 0) {
        alert("Please select values for: " + missingFields.join(", "));
        event.preventDefault(); // Prevent form submission
    }
});



document.addEventListener("DOMContentLoaded", function () {
    const uploadSlots = document.querySelectorAll(".add_photo");

    uploadSlots.forEach((slot, index) => {
        const hiddenInput = slot.querySelector('.file_upload_input');
        const removeBtn = slot.querySelector(".remove_photo_btn");
        const cameraIcon = slot.querySelector(".add_camera");

        slot.addEventListener('click', () => {
            if (!slot.classList.contains("uploaded")) {
                hiddenInput.click();
            }
        });

        hiddenInput.addEventListener('change', () => {
            const image = hiddenInput.files[0];
            if (image) {
                const reader = new FileReader();
                reader.onload = () => {
                    slot.classList.add("uploaded");
                    cameraIcon.style.display = "none";
                    removeBtn.style.display = "block";

                    const img = document.createElement('img');
                    img.classList.add('preview');
                    img.src = reader.result;
                    img.style.width = "100%";
                    img.style.height = "100%";
                    img.style.objectFit = "cover";

                    const existingPreview = slot.querySelector('.preview');
                    if (existingPreview) slot.removeChild(existingPreview);
                    slot.appendChild(img);

                    hiddenInput.value = "";
                    reorderSlots(); // Ensure correct order
                };
                reader.readAsDataURL(image);
            }
        });

        removeBtn.addEventListener("click", function (event) {
            event.stopPropagation();

            slot.classList.remove("uploaded");
            cameraIcon.style.display = "block";
            removeBtn.style.display = "none";

            const previewImg = slot.querySelector(".preview");
            if (previewImg) slot.removeChild(previewImg);

            hiddenInput.value = ""; 

            reorderSlots(); // Reorganize images
        });
    });

    function reorderSlots() {
        let images = [];
        uploadSlots.forEach(slot => {
            let img = slot.querySelector(".preview");
            if (img) images.push(img.src);
        });

        uploadSlots.forEach(slot => {
            slot.classList.remove("uploaded");
            slot.querySelector(".add_camera").style.display = "block";
            slot.querySelector(".remove_photo_btn").style.display = "none";

            const previewImg = slot.querySelector(".preview");
            if (previewImg) slot.removeChild(previewImg);
        });

        images.forEach((src, index) => {
            const slot = uploadSlots[index];
            slot.classList.add("uploaded");
            slot.querySelector(".add_camera").style.display = "none";
            slot.querySelector(".remove_photo_btn").style.display = "block";

            const img = document.createElement('img');
            img.classList.add('preview');
            img.src = src;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
            slot.appendChild(img);
        });
    }
});


