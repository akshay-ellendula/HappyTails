document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = window.location.pathname.split('/').pop();
    if (orderId) {
        fetchOrderDetails(orderId);
    }

    document.getElementById('print-order-btn').addEventListener('click', () => {
        window.print();
    });
});

async function fetchOrderDetails(orderId) {

    try {
        const response = await fetch(`/api/admin/order/${orderId}`);
        const data = await response.json();
        if (data.success) {
            renderOrderDetails(data.order);
        } else {
            document.getElementById('orderView').innerHTML = '<p>Order not found.</p>';
            document.getElementById('orderItemsTable').innerHTML = '<tr><td colspan="6">No items found.</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching order details:', error);
        document.getElementById('orderView').innerHTML = '<p>Server error. Please try again.</p>';
        document.getElementById('orderItemsTable').innerHTML = '<tr><td colspan="6">Server error.</td></tr>';
    }
}
function renderOrderDetails(order) {
    document.getElementById('orderId').textContent = `#ORD-${order.orderId}`;
    const statusSpan = document.getElementById('orderStatus');
    statusSpan.textContent = order.status;
    statusSpan.className = `status-badge ${order.status}`;
    document.getElementById('orderDate').textContent = new Date(order.orderDate).toLocaleString();
    document.getElementById('orderTotal').textContent = `₹${order.totalAmount.toFixed(2)}`;
    document.getElementById('paymentMethod').textContent = `Credit Card (****${order.paymentLastFour})`;
    document.getElementById('transactionId').textContent = order.paymentLastFour || 'N/A';

    document.getElementById('customerName').textContent = order.customer.name || 'N/A';
    document.getElementById('customerEmail').textContent = order.customer.email || 'N/A';
    document.getElementById('customerPhone').textContent = order.customer.phone || 'N/A';
    document.getElementById('customerAddress').textContent = order.customer.address || 'N/A';

    const itemsTableBody = document.getElementById('orderItemsTable');
    itemsTableBody.innerHTML = '';
    
    order.items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.productId}</td>
            <td>${item.productName}</td>
            <td>${item.vendorName}</td>
            <td>₹${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>₹${(item.price * item.quantity).toFixed(2)}</td>
        `;
        itemsTableBody.appendChild(row);
    });
}