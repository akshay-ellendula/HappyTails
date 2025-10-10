// Navigate back to products list
function goBack() {
    window.location.href = "/admin-products";
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
async function saveProductChanges() {
    // Get product ID from URL path
    const productId = window.location.pathname.split('/').pop();

    // Create a new FormData object
    const formData = new FormData();
    
    // Append fields with the names expected by the backend
    formData.append('product_name', document.getElementById("edit-name").value);
    formData.append('product_category', document.getElementById("edit-category").value);
    formData.append('product_type', 'Pet Food'); // Assuming a static value for this example
    formData.append('product_description', document.getElementById("edit-description").value);
    formData.append('stock_status', parseInt(document.getElementById("edit-stock").value) > 0 ? 'In Stock' : 'Out of Stock');
    
    // Create a variants array and append it as a JSON string
    const variants = [{
        size: null,
        color: null,
        regular_price: parseFloat(document.getElementById("edit-price").value),
        sale_price: null,
        stock_quantity: parseInt(document.getElementById("edit-stock").value),
        sku: document.getElementById("edit-sku").value
    }];
    formData.append('variants', JSON.stringify(variants));

    try {
        const response = await fetch(`/admin/product/${productId}`, {
            method: 'POST',
            body: formData // Send the FormData object
        });

        const result = await response.json();

        if (result.success) {
            alert("Product updated successfully!");
            window.location.reload();
        } else {
            alert("Failed to update product: " + result.message);
        }
    } catch (error) {
        console.error('Error updating product:', error);
        alert("Server error. Failed to update product.");
    }
}

// Delete product
async function deleteProduct() {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }

    // Get product ID from URL path
    const productId = window.location.pathname.split('/').pop();
    
    try {
        const response = await fetch(`/admin/product/${productId}`, {
            method: 'DELETE',
        });
        const result = await response.json();
        if (result.success) {
            alert("Product deleted successfully!");
            window.location.href = '/admin-products';
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Server error while deleting product.');
    }
}

// The fetchProductData function is now obsolete as data is passed from the server.
// Remove it entirely.