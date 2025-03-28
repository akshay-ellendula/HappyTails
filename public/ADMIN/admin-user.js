// admin-user.js
let allUsers = [];
let currentPage = 1;
const usersPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    fetchUserStats();

    // Search functionality
    document.getElementById('userSearchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredUsers = allUsers.filter(user =>
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        );
        currentPage = 1;
        displayUsers(filteredUsers);
        updatePagination(filteredUsers.length);
    });

    // Filter button (placeholder for future functionality)
    document.getElementById('filterBtn').addEventListener('click', () => {
        alert('Filter options coming soon!');
    });
});

function fetchUsers() {
    fetch('/admin/users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allUsers = data.users;
                displayUsers(allUsers);
                updatePagination(allUsers.length);
            } else {
                console.error('Failed to fetch users:', data.message);
                displayUsers([]);
            }
        })
        .catch(error => {
            console.error('Error fetching users:', error);
            displayUsers([]);
        });
}

function fetchUserStats() {
    fetch('/admin/user-stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.stats;
                document.querySelector('.stats-container .stat-card:nth-child(1) .number').textContent = stats.total || 0;
                document.querySelector('.stats-container .stat-card:nth-child(2) .number').textContent = stats.monthly || 0;
                document.querySelector('.stats-container .stat-card:nth-child(3) .number').textContent = stats.weekly || 0;
                document.querySelector('.stats-container .stat-card:nth-child(4) .number').textContent = stats.daily || 0;
            } else {
                console.error('Failed to fetch user stats:', data.message);
                updateStatsWithError();
            }
        })
        .catch(error => {
            console.error('Error fetching user stats:', error);
            updateStatsWithError();
        });
}

function displayUsers(usersToDisplay) {
    const userTableBody = document.getElementById('userTableBody');
    userTableBody.innerHTML = '';

    if (usersToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5">No users found</td>';
        userTableBody.appendChild(row);
        return;
    }

    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const paginatedUsers = usersToDisplay.slice(start, end);

    paginatedUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.joined_date ? new Date(user.joined_date).toLocaleDateString() : 'N/A'}</td>
            <td>
                <a href="/admin-user-details?id=${user.id}" class="action-btn">View</a>
            </td>
        `;
        userTableBody.appendChild(row);
    });
}

function updateStatsWithError() {
    document.querySelector('.stats-container .stat-card:nth-child(1) .number').textContent = 'N/A';
    document.querySelector('.stats-container .stat-card:nth-child(2) .number').textContent = 'N/A';
    document.querySelector('.stats-container .stat-card:nth-child(3) .number').textContent = 'N/A';
    document.querySelector('.stats-container .stat-card:nth-child(4) .number').textContent = 'N/A';
}

function updatePagination(totalUsers) {
    const totalPages = Math.ceil(totalUsers / usersPerPage);
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
    const totalPages = Math.ceil(allUsers.length / usersPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    displayUsers(allUsers);
    updatePagination(allUsers.length);

    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === currentPage) {
            btn.classList.add('active');
        }
    });
}