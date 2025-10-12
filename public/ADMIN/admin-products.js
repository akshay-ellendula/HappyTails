let allProducts = [];
let currentPage = 1;
const productsPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    fetchProductStats();

    // Search functionality
    document.getElementById('productSearchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = allProducts.filter(product =>
            product.product_name.toLowerCase().includes(searchTerm) ||
            product.id.toString().includes(searchTerm)
        );
        currentPage = 1;
        displayProducts(filteredProducts);
        updatePagination(filteredProducts.length);
    });

    // Filter button (placeholder for future functionality)
    document.getElementById('filterBtn').addEventListener('click', () => {
        alert('Filter functionality coming soon!');
    });
});

// Fetch and display products
function fetchProducts() {
    fetch('/admin/products')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allProducts = data.products;
                displayProducts(allProducts);
                updatePagination(allProducts.length);
            } else {
                console.error('Failed to fetch products:', data.message);
                document.getElementById('productTableBody').innerHTML = '<tr><td colspan="7">No products found</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching products:', error);
            document.getElementById('productTableBody').innerHTML = '<tr><td colspan="7">Error loading products</td></tr>';
        });
}

function displayProducts(productsToDisplay) {
    const productTableBody = document.getElementById('productTableBody');
    productTableBody.innerHTML = '';

    if (productsToDisplay.length === 0) {
        productTableBody.innerHTML = '<tr><td colspan="7">No products found</td></tr>';
        return;
    }

    // Implement pagination
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const paginatedProducts = productsToDisplay.slice(start, end);

    paginatedProducts.forEach(product => {
        // Determine stock status class
        let stockClass = 'out-of-stock';
        if (product.stock > 5) {
            stockClass = 'in-stock';
        } else if (product.stock > 0) {
            stockClass = 'low-stock';
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${product.id}</td>
            <td>${product.product_name}</td>
            <td>${product.category}</td>
            <td>₹${product.price.toFixed(2)}</td>
            <td><span class="stock-indicator ${stockClass}">${product.stock}</span></td>
            <td>${new Date(product.added_date).toLocaleDateString()}</td>
            <td>
                <button class="action-btn view-btn" onclick="window.location.href='/admin-product-details/${product.id}'">View</button>
                <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')">Delete</button>
            </td>
        `;
        productTableBody.appendChild(row);
    });
}

// Fetch and display product stats
function fetchProductStats() {
    fetch('/admin/product-stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.stats;

                // Total Products and percentage change
                document.getElementById('totalProducts').textContent = stats.total || 0;
                const totalChange = stats.totalLastMonth > 0
                    ? (((stats.total - stats.totalLastMonth) / stats.totalLastMonth) * 100).toFixed(1)
                    : 0;
                document.getElementById('monthlyChange').textContent = `${totalChange >= 0 ? '+' : ''}${totalChange}% from last month`;

                // In Stock and percentage change
                document.getElementById('inStock').textContent = stats.inStock || 0;
                const inStockChange = stats.inStockLastMonth > 0
                    ? (((stats.inStock - stats.inStockLastMonth) / stats.inStockLastMonth) * 100).toFixed(1)
                    : 0;
                document.getElementById('inStockChange').textContent = `${inStockChange >= 0 ? '+' : ''}${inStockChange}% from previous month`;

                // Low Stock and percentage change
                document.getElementById('lowStock').textContent = stats.lowStock || 0;
                const lowStockChange = stats.lowStockLastWeek > 0
                    ? (((stats.lowStock - stats.lowStockLastWeek) / stats.lowStockLastWeek) * 100).toFixed(1)
                    : 0;
                document.getElementById('lowStockChange').textContent = `${lowStockChange >= 0 ? '+' : ''}${lowStockChange}% from last week`;

                // Out of Stock and change
                document.getElementById('outOfStock').textContent = stats.outOfStock || 0;
                const outOfStockChange = (stats.outOfStock - stats.outOfStockYesterday) || 0;
                document.getElementById('outOfStockChange').textContent = `${outOfStockChange >= 0 ? '+' : ''}${outOfStockChange} from yesterday`;
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

function updateStatsWithError() {
    document.getElementById('totalProducts').textContent = 'N/A';
    document.getElementById('monthlyChange').textContent = 'N/A';
    document.getElementById('inStock').textContent = 'N/A';
    document.getElementById('inStockChange').textContent = 'N/A';
    document.getElementById('lowStock').textContent = 'N/A';
    document.getElementById('lowStockChange').textContent = 'N/A';
    document.getElementById('outOfStock').textContent = 'N/A';
    document.getElementById('outOfStockChange').textContent = 'N/A';
}

function updatePagination(totalProducts) {
    const totalPages = Math.ceil(totalProducts / productsPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        button.textContent = i;
        button.onclick = () => changePage(i);
        pagination.appendChild(button);
    }

    if (totalPages > 1) {
        const nextButton = document.createElement('button');
        nextButton.className = 'page-btn';
        nextButton.textContent = 'Next';
        nextButton.onclick = () => changePage(currentPage + 1);
        pagination.appendChild(nextButton);
    }
}

function changePage(page) {
    const totalPages = Math.ceil(allProducts.length / productsPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    const searchInput = document.getElementById('productSearchInput').value.toLowerCase();
    const filteredProducts = allProducts.filter(product =>
        product.product_name.toLowerCase().includes(searchInput) ||
        product.id.toString().includes(searchInput)
    );
    displayProducts(filteredProducts);
    updatePagination(filteredProducts.length);

    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === currentPage) {
            btn.classList.add('active');
        }
    });
}

// Delete product
function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        fetch(`/admin/product/${productId}`, {
            method: 'DELETE',
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Product deleted successfully');
                    allProducts = allProducts.filter(product => product.id !== productId);
                    const searchInput = document.getElementById('productSearchInput').value.toLowerCase();
                    const filteredProducts = allProducts.filter(product =>
                        product.product_name.toLowerCase().includes(searchInput) ||
                        product.id.toString().includes(searchInput)
                    );
                    displayProducts(filteredProducts);
                    updatePagination(filteredProducts.length);
                    fetchProductStats(); // Refresh stats after deletion
                } else {
                    alert('Failed to delete product: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting product:', error);
                alert('Error deleting product');
            });
    }
}