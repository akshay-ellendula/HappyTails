document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();

    const searchInput = document.getElementById('orderSearchInput');
    searchInput.addEventListener('input', debounce(fetchOrders, 300));
});

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

async function fetchOrders() {
    const tableBody = document.getElementById('orderTableBody');
    tableBody.innerHTML = '<tr><td colspan="6">Loading orders...</td></tr>';

    const searchTerm = document.getElementById('orderSearchInput').value.toLowerCase();

    try {
        const response = await fetch('/api/admin/orders');
        const data = await response.json();

        if (data.success) {
            const orders = data.orders.filter(order =>
                order.orderId.toLowerCase().includes(searchTerm) ||
                order.customerName.toLowerCase().includes(searchTerm)
            );
            renderOrders(orders);
        } else {
            tableBody.innerHTML = '<tr><td colspan="6">Error loading orders.</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        tableBody.innerHTML = '<tr><td colspan="6">Server error. Please try again later.</td></tr>';
    }
}

function renderOrders(orders) {
    const tableBody = document.getElementById('orderTableBody');
    tableBody.innerHTML = '';

    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No orders found.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        const statusClass = order.status.toLowerCase();
        
        row.innerHTML = `
            <td>#ORD-${order.orderId}</td>
            <td>${order.customerName}</td>
            <td>${new Date(order.orderDate).toLocaleDateString()}</td>
            <td>₹${order.totalAmount.toFixed(2)}</td>
            <td><span class="status-badge ${statusClass}">${order.status}</span></td>
            <td class="actions-cell">
                <a href="/admin-order-details/${order.orderId}">
                    <i class="fa fa-eye" title="View Details"></i>
                </a>
            </td>
        `;
        tableBody.appendChild(row);
    });
}