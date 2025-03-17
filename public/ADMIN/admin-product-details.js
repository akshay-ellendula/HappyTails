// Navigate back to products list
function goBack() {
    window.location.href = "admin-products"
}

// Show the edit form
function showEditForm() {
    document.getElementById("productView").style.display = "none";
    document.getElementById("editForm").style.display = "block";
    
    // Pre-fill the form with current values
    document.getElementById("edit-name").value = document.getElementById("productName").textContent;
    document.getElementById("edit-category").value = document.getElementById("productCategory").textContent;
    document.getElementById("edit-price").value = document.getElementById("productPrice").textContent.replace('$', '');
    document.getElementById("edit-stock").value = document.getElementById("currentStock").textContent;
    document.getElementById("edit-sku").value = document.getElementById("productSku").textContent;
    document.getElementById("edit-brand").value = document.getElementById("brand").textContent;
    document.getElementById("edit-description").value = document.getElementById("productDescription").textContent;
}

// Hide the edit form
function hideEditForm() {
    document.getElementById("productView").style.display = "block";
    document.getElementById("editForm").style.display = "none";
}

// Save product changes
function saveProductChanges() {
    // Get values from form
    const name = document.getElementById("edit-name").value;
    const category = document.getElementById("edit-category").value;
    const price = document.getElementById("edit-price").value;
    const stock = document.getElementById("edit-stock").value;
    const sku = document.getElementById("edit-sku").value;
    const brand = document.getElementById("edit-brand").value;
    const description = document.getElementById("edit-description").value;
    
    // Update product view with new values
    document.getElementById("productName").textContent = name;
    document.getElementById("productCategory").textContent = category;
    document.getElementById("productPrice").textContent = `$${price}`;
    document.getElementById("currentStock").textContent = stock;
    document.getElementById("productSku").textContent = sku;
    document.getElementById("brand").textContent = brand;
    document.getElementById("productDescription").textContent = description;
    
    // Update stock status based on quantity
    const stockStatus = document.getElementById("stockStatus");
    if (parseInt(stock) <= 0) {
        stockStatus.className = "status-badge out-of-stock";
        stockStatus.textContent = "Out of Stock";
    } else if (parseInt(stock) < 10) {
        stockStatus.className = "status-badge low-stock";
        stockStatus.textContent = "Low Stock";
    } else {
        stockStatus.className = "status-badge low-stock";
        stockStatus.textContent = "In Stock";
    }
    
    
    
    // Show success message
    alert("Product updated successfully!");
    
    // Hide the form and show the product view
    hideEditForm();
}



// Initialize any event listeners or other functionality when the page loads
document.addEventListener("DOMContentLoaded", function() {
    console.log("Product details page loaded");
    
    // You could fetch product data from an API here if needed
    // fetchProductData(productId);
});

