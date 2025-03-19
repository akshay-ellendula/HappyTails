// DOM Elements
const productTableBody = document.getElementById('productTableBody');
const productSearchInput = document.getElementById('productSearchInput');
const filterBtn = document.getElementById('filterBtn');
const addProductBtn = document.getElementById('addProductBtn');

// Load data when the page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchProductStats();
    fetchProducts();
    setupEventListeners();
});

// Fetch and display product stats dynamically
function fetchProductStats() {
    fetch('/admin/product-stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.stats;
                document.querySelector('.stats-container .stat-card:nth-child(1) .number').textContent = stats.total;
                document.querySelector('.stats-container .stat-card:nth-child(2) .number').textContent = stats.inStock;
                document.querySelector('.stats-container .stat-card:nth-child(3) .number').textContent = stats.lowStock;
                document.querySelector('.stats-container .stat-card:nth-child(4) .number').textContent = stats.outOfStock;
            } else {
                console.error('Failed to fetch product stats:', data.message);
                updateStatsWithError();
            }
        })
        .catch(error => {
            console.error('Error fetching product stats:', error);
            updateStatsWithError();
        });
}

// Handle stats fetch failure
function updateStatsWithError() {
    document.querySelector('.stats-container .stat-card:nth-child(1) .number').textContent = 'N/A';
    document.querySelector('.stats-container .stat-card:nth-child(2) .number').textContent = 'N/A';
    document.querySelector('.stats-container .stat-card:nth-child(3) .number').textContent = 'N/A';
    document.querySelector('.stats-container .stat-card:nth-child(4) .number').textContent = 'N/A';
}

// Fetch and display products dynamically
function fetchProducts() {
    const searchTerm = productSearchInput.value.toLowerCase();
    
    fetch('/admin/products')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayProducts(filterProducts(data.products, searchTerm));
            } else {
                console.error('Failed to fetch products:', data.message);
                displayProducts([]); // Display empty table on failure
            }
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            displayProducts([]); // Display empty table on error
        });
}

// Filter products based on search input
function filterProducts(products, searchTerm) {
    if (!searchTerm) return products;
    return products.filter(product => 
        product.product_name.toLowerCase().includes(searchTerm) || 
        product.id.toString().includes(searchTerm) ||
        product.product_category.toLowerCase().includes(searchTerm)
    );
}

// Display products in the table
function displayProducts(productsToDisplay) {
    productTableBody.innerHTML = '';

    if (productsToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7">No products found</td>';
        productTableBody.appendChild(row);
        return;
    }

    productsToDisplay.forEach(product => {
        const row = document.createElement('tr');
        const addedDate = new Date(product.created_at).toLocaleDateString(); // Assumes API returns created_at
        row.innerHTML = `
            <td>#${product.id}</td>
            <td>${product.product_name}</td>
            <td>${product.product_category}</td>
            <td>₹${product.regular_price.toFixed(2)}</td>
            <td>${product.stock_quantity > 0 ? product.stock_quantity : 'Out of Stock'}</td>
            <td>${addedDate}</td>
            <td>
                <a href="/admin-product-details?id=${product.id}" class="action-btn">View</a>
                <a href="/shop-product-edit?id=${product.id}" class="action-btn edit-product" data-id="${product.id}">Edit</a>
            </td>
        `;
        productTableBody.appendChild(row);
    });

    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-id');
            editProduct(productId);
        });
    });
}

// Edit product function
function editProduct(productId) {
    // Redirect to the edit page (assumes shop-product-edit exists in your app)
    window.location.href = `/shop-product-edit?id=${productId}`;
}

// Add new product function
function addNewProduct() {
    // Redirect to the add product page (assumes shop-product_form exists)
    window.location.href = '/shop-product_form';
}

// Set up event listeners
function setupEventListeners() {
    if (productSearchInput) {
        productSearchInput.addEventListener('input', fetchProducts);
    }
    
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            alert('Filter functionality coming soon!'); // Placeholder for future filter implementation
        });
    }

    if (addProductBtn) {
        addProductBtn.addEventListener('click', addNewProduct);
    }

    // Pagination buttons (simplified client-side pagination)
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            fetchProducts(); // Add server-side pagination logic later if needed
        });
    });
}