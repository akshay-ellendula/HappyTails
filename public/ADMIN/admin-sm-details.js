// public/ADMIN/admin-sm-details.js

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const managerId = urlParams.get('id');

// Function to go back to shop managers page
function goBack() {
    window.location.href = "/admin-shop-manager";
}

// Function to fetch shop manager details from the backend
async function fetchManagerDetails() {
    try {
        const response = await fetch(`/admin/vendor/${managerId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            const manager = data.vendor;
            document.getElementById('managerAvatar').textContent = manager.name.charAt(0);
            document.getElementById('managerName').textContent = manager.name;
            document.getElementById('managerEmail').textContent = manager.email;
            document.getElementById('managerId').textContent = `#${String(manager.id).padStart(3, '0')}`;
            document.getElementById('storeName').textContent = manager.store_name || 'Not provided';
            document.getElementById('storeLocation').textContent = manager.store_location || 'Not provided';
            document.getElementById('joinedDate').textContent = new Date(manager.joined_date).toLocaleDateString();
        } else {
            alert('Failed to load shop manager details: ' + data.message);
            goBack();
        }
    } catch (error) {
        console.error('Error fetching shop manager:', error);
        alert('An error occurred while fetching shop manager details.');
        goBack();
    }
}

// Function to fetch revenue metrics
async function fetchRevenueMetrics() {
    try {
        const response = await fetch(`/admin/vendor/${managerId}/revenue-metrics`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            const metrics = data.metrics;
            document.getElementById('todayRevenue').textContent = `$${metrics.today_revenue.toFixed(2)}`;
            document.getElementById('weeklyRevenue').textContent = `$${metrics.weekly_revenue.toFixed(2)}`;
            document.getElementById('monthlyRevenue').textContent = `$${metrics.monthly_revenue.toFixed(2)}`;
            document.getElementById('quarterlyRevenue').textContent = `$${metrics.quarterly_revenue.toFixed(2)}`;

            const revenueTableBody = document.getElementById('revenueTableBody');
            revenueTableBody.innerHTML = '';
            if (metrics.monthly_breakdown.length > 0) {
                metrics.monthly_breakdown.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${new Date(row.month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</td>
                        <td>$${row.total_sales.toFixed(2)}</td>
                        <td>${row.orders}</td>
                        <td>$${row.avg_order_value.toFixed(2)}</td>
                    `;
                    revenueTableBody.appendChild(tr);
                });
            } else {
                revenueTableBody.innerHTML = '<tr><td colspan="4">No revenue data available</td></tr>';
            }
        } else {
            console.error('Failed to fetch revenue metrics:', data.message);
            document.getElementById('revenueTableBody').innerHTML = '<tr><td colspan="4">Error loading revenue data</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching revenue metrics:', error);
        document.getElementById('revenueTableBody').innerHTML = '<tr><td colspan="4">Error loading revenue data</td></tr>';
    }
}

// Function to fetch products managed by the vendor
async function fetchProducts() {
    try {
        const response = await fetch(`/admin/vendor/${managerId}/products`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        const productsTableBody = document.getElementById('productsTableBody');
        productsTableBody.innerHTML = '';

        if (data.success && data.products.length > 0) {
            data.products.forEach(product => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${product.product_id}</td>
                    <td>${product.product_name}</td>
                    <td>${product.category}</td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td>${product.stock}</td>
                `;
                productsTableBody.appendChild(tr);
            });
        } else {
            productsTableBody.innerHTML = '<tr><td colspan="5">No products available</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        document.getElementById('productsTableBody').innerHTML = '<tr><td colspan="5">Error loading products</td></tr>';
    }
}

// Function to fetch top customers
async function fetchTopCustomers() {
    try {
        const response = await fetch(`/admin/vendor/${managerId}/top-customers`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        const customersTableBody = document.getElementById('customersTableBody');
        customersTableBody.innerHTML = '';

        if (data.success && data.customers.length > 0) {
            data.customers.forEach(customer => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#USR${String(customer.customer_id).padStart(3, '0')}</td>
                    <td>${customer.customer_name}</td>
                    <td>${customer.total_orders}</td>
                    <td>$${customer.total_spent.toFixed(2)}</td>
                    <td>${new Date(customer.last_purchase).toLocaleDateString()}</td>
                `;
                customersTableBody.appendChild(tr);
            });
        } else {
            customersTableBody.innerHTML = '<tr><td colspan="5">No customers available</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching top customers:', error);
        document.getElementById('customersTableBody').innerHTML = '<tr><td colspan="5">Error loading customers</td></tr>';
    }
}

// Function to show edit form and populate it
function showEditForm() {
    document.getElementById('managerView').style.display = 'none';
    document.getElementById('editForm').style.display = 'block';

    // Load current values into form
    document.getElementById('editName').value = document.getElementById('managerName').textContent;
    document.getElementById('editEmail').value = document.getElementById('managerEmail').textContent;
    document.getElementById('editStoreName').value = document.getElementById('storeName').textContent === 'Not provided' ? '' : document.getElementById('storeName').textContent;
    document.getElementById('editStoreLocation').value = document.getElementById('storeLocation').textContent === 'Not provided' ? '' : document.getElementById('storeLocation').textContent;
}

// Function to cancel edit
function cancelEdit() {
    document.getElementById('managerView').style.display = 'block';
    document.getElementById('editForm').style.display = 'none';
    document.querySelectorAll('.error-message').forEach(error => error.textContent = '');
}

// Function to validate form
function validateForm() {
    let isValid = true;
    const name = document.getElementById('editName');
    const email = document.getElementById('editEmail');
    const storeName = document.getElementById('editStoreName');
    const storeLocation = document.getElementById('editStoreLocation');

    // Reset error messages
    document.querySelectorAll('.error-message').forEach(error => error.textContent = '');

    // Name validation
    if (name.value.trim().length < 2) {
        document.getElementById('nameError').textContent = 'Name must be at least 2 characters long';
        isValid = false;
    }

    // Email validation (not editable, but included for completeness)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value)) {
        document.getElementById('emailError').textContent = 'Please enter a valid email address';
        isValid = false;
    }

    // Store Name validation
    if (storeName.value.trim().length < 2) {
        document.getElementById('storeNameError').textContent = 'Store name must be at least 2 characters long';
        isValid = false;
    }

    // Store Location validation
    if (storeLocation.value.trim() && storeLocation.value.trim().length < 5) {
        document.getElementById('storeLocationError').textContent = 'Store location must be at least 5 characters long if provided';
        isValid = false;
    }

    return isValid;
}

// Function to save shop manager changes
async function saveManagerChanges(event) {
    event.preventDefault();

    if (!validateForm()) return;

    const name = document.getElementById('editName').value;
    const storeName = document.getElementById('editStoreName').value;
    const storeLocation = document.getElementById('editStoreLocation').value || null;

    try {
        const response = await fetch(`/admin/vendor/${managerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendor_name: name, store_name: storeName, store_location: storeLocation })
        });
        const data = await response.json();

        if (data.success) {
            // Update display
            document.getElementById('managerName').textContent = name;
            document.getElementById('storeName').textContent = storeName || 'Not provided';
            document.getElementById('storeLocation').textContent = storeLocation || 'Not provided';
            document.getElementById('managerAvatar').textContent = name.charAt(0);

            cancelEdit();
            alert('Shop manager information updated successfully!');
        } else {
            alert('Failed to update shop manager: ' + data.message);
        }
    } catch (error) {
        console.error('Error updating shop manager:', error);
        alert('An error occurred while updating shop manager details.');
    }
}

// Function to delete shop manager
async function deleteShopManager() {
    if (!confirm('Are you sure you want to delete this shop manager?')) return;

    try {
        const response = await fetch(`/admin/vendor/${managerId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            alert('Shop manager deleted successfully!');
            goBack();
        } else {
            alert('Failed to delete shop manager: ' + data.message);
        }
    } catch (error) {
        console.error('Error deleting shop manager:', error);
        alert('An error occurred while deleting the shop manager.');
    }
}

// Event listener for form submission
document.getElementById('managerEditForm').addEventListener('submit', saveManagerChanges);

// Load shop manager details, revenue metrics, products, and top customers on page load
window.onload = () => {
    if (!managerId) {
        alert('No shop manager ID provided');
        goBack();
        return;
    }
    fetchManagerDetails();
    fetchRevenueMetrics();
    fetchProducts();
    fetchTopCustomers();
};