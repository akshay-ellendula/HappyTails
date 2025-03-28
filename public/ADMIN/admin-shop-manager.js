// public/ADMIN/admin-shop-manager.js
let allManagers = [];
let currentPage = 1;
const managersPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    fetchManagers();
    fetchManagerStats();

    // Search functionality
    document.getElementById('managerSearchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredManagers = allManagers.filter(manager =>
            manager.name.toLowerCase().includes(searchTerm) ||
            manager.email.toLowerCase().includes(searchTerm) ||
            manager.store_name.toLowerCase().includes(searchTerm)
        );
        currentPage = 1;
        displayManagers(filteredManagers);
        updatePagination(filteredManagers.length);
    });

    // Filter button (placeholder for future functionality)
    document.getElementById('filterBtn').addEventListener('click', () => {
        alert('Filter options coming soon!');
    });
});

function fetchManagers() {
    fetch('/admin/vendors')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allManagers = data.vendors;
                displayManagers(allManagers);
                updatePagination(allManagers.length);
            } else {
                console.error('Failed to fetch shop managers:', data.message);
                displayManagers([]);
            }
        })
        .catch(error => {
            console.error('Error fetching shop managers:', error);
            displayManagers([]);
        });
}

function fetchManagerStats() {
    fetch('/admin/vendor-stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.stats;
                document.querySelector('.stats-container .stat-card:nth-child(1) .number').textContent = stats.total || 0;
                document.querySelector('.stats-container .stat-card:nth-child(2) .number').textContent = `$${stats.totalRevenue ? stats.totalRevenue.toLocaleString() : 0}`;
                document.querySelector('.stats-container .stat-card:nth-child(3) .number').textContent = stats.totalOrders ? stats.totalOrders.toLocaleString() : 0;
                document.querySelector('.stats-container .stat-card:nth-child(4) .number').textContent = stats.todaysOrders || 0;
            } else {
                console.error('Failed to fetch shop manager stats:', data.message);
                updateStatsWithError();
            }
        })
        .catch(error => {
            console.error('Error fetching shop manager stats:', error);
            updateStatsWithError();
        });
}

function displayManagers(managersToDisplay) {
    const managerTableBody = document.getElementById('managerTableBody');
    managerTableBody.innerHTML = '';

    if (managersToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6">No shop managers found</td>';
        managerTableBody.appendChild(row);
        return;
    }

    const start = (currentPage - 1) * managersPerPage;
    const end = start + managersPerPage;
    const paginatedManagers = managersToDisplay.slice(start, end);

    paginatedManagers.forEach(manager => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${manager.id}</td>
            <td>${manager.name}</td>
            <td>${manager.store_name}</td>
            <td>${manager.email}</td>
            <td>${manager.joined_date ? new Date(manager.joined_date).toLocaleDateString() : 'N/A'}</td>
            <td>
                <a href="/admin-sm-details?id=${manager.id}" class="action-btn">View</a>
            </td>
        `;
        managerTableBody.appendChild(row);
    });
}

function updateStatsWithError() {
    document.querySelector('.stats-container .stat-card:nth-child(1) .number').textContent = 'N/A';
    document.querySelector('.stats-container .stat-card:nth-child(2) .number').textContent = 'N/A';
    document.querySelector('.stats-container .stat-card:nth-child(3) .number').textContent = 'N/A';
    document.querySelector('.stats-container .stat-card:nth-child(4) .number').textContent = 'N/A';
}

function updatePagination(totalManagers) {
    const totalPages = Math.ceil(totalManagers / managersPerPage);
    const pagination = document.querySelector('.pagination');
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
    const totalPages = Math.ceil(allManagers.length / managersPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    displayManagers(allManagers);
    updatePagination(allManagers.length);

    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === currentPage) {
            btn.classList.add('active');
        }
    });
}