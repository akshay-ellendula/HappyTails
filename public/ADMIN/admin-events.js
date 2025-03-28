// public/ADMIN/admin-events.js
let allEventManagers = [];
let currentPage = 1;
const managersPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    fetchEventManagers();
    fetchEventManagerStats();

    // Search functionality
    document.getElementById('eventManagerSearchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredManagers = allEventManagers.filter(manager =>
            manager.name.toLowerCase().includes(searchTerm) ||
            manager.email.toLowerCase().includes(searchTerm) ||
            manager.organization.toLowerCase().includes(searchTerm)
        );
        currentPage = 1;
        displayEventManagers(filteredManagers);
        updatePagination(filteredManagers.length);
    });

    // Filter button (placeholder for future functionality)
    document.getElementById('filterBtn').addEventListener('click', () => {
        alert('Filter functionality coming soon!');
    });
});

function fetchEventManagers() {
    fetch('/admin/event-managers')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allEventManagers = data.eventManagers;
                displayEventManagers(allEventManagers);
                updatePagination(allEventManagers.length);
            } else {
                console.error('Failed to fetch event managers:', data.message);
                displayEventManagers([]);
            }
        })
        .catch(error => {
            console.error('Error fetching event managers:', error);
            displayEventManagers([]);
        });
}

function fetchEventManagerStats() {
    fetch('/admin/event-manager-stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.stats;
                document.getElementById('totalEventManagers').textContent = stats.total || 0;
                document.getElementById('monthlyChange').textContent = `+${stats.monthly || 0} from last month`;
                document.getElementById('totalRevenue').textContent = `$${stats.revenue.toLocaleString() || 0}`;
                document.getElementById('todayEvents').textContent = stats.todayEvents || 0;

                // Fetch total events separately
                fetchTotalEvents();
            } else {
                console.error('Failed to fetch event manager stats:', data.message);
                updateStatsWithError();
            }
        })
        .catch(error => {
            console.error('Error fetching event manager stats:', error);
            updateStatsWithError();
        });
}

function fetchTotalEvents() {
    fetch('/admin/total-events')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('totalEvents').textContent = data.total || 0;
            } else {
                console.error('Failed to fetch total events:', data.message);
                document.getElementById('totalEvents').textContent = 'N/A';
            }
        })
        .catch(error => {
            console.error('Error fetching total events:', error);
            document.getElementById('totalEvents').textContent = 'N/A';
        });
}

function displayEventManagers(managersToDisplay) {
    const eventManagerTableBody = document.getElementById('eventManagerTableBody');
    eventManagerTableBody.innerHTML = '';

    if (managersToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6">No event managers found</td>';
        eventManagerTableBody.appendChild(row);
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
            <td>${manager.organization}</td>
            <td>${manager.email}</td>
            <td>${manager.joined_date ? new Date(manager.joined_date).toLocaleDateString() : 'N/A'}</td>
            <td>
                <a href="/admin-em-details?id=${manager.id}" class="action-btn">View</a>
            </td>
        `;
        eventManagerTableBody.appendChild(row);
    });
}

function updateStatsWithError() {
    document.getElementById('totalEventManagers').textContent = 'N/A';
    document.getElementById('monthlyChange').textContent = 'N/A';
    document.getElementById('totalRevenue').textContent = 'N/A';
    document.getElementById('totalEvents').textContent = 'N/A';
    document.getElementById('todayEvents').textContent = 'N/A';
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
    const totalPages = Math.ceil(allEventManagers.length / managersPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    displayEventManagers(allEventManagers);
    updatePagination(allEventManagers.length);

    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === currentPage) {
            btn.classList.add('active');
        }
    });
}