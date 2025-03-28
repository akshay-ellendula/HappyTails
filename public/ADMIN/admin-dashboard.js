document.addEventListener('DOMContentLoaded', function() {
    // Fetch dashboard stats and recent entities
    fetchDashboardStats();
    fetchRecentUsers();

    // Initialize Revenue Chart
    const revenueChartCtx = document.getElementById('revenueChart').getContext('2d');
    const revenueChart = new Chart(revenueChartCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'Pet Sales',
                    data: [18500, 22000, 19500, 24000, 25500, 27000, 28500, 31000, 29500, 32000, 35000, 38000],
                    borderColor: '#8fbc8f',
                    backgroundColor: 'rgba(143, 188, 143, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Products',
                    data: [12000, 13500, 14700, 15200, 16800, 18000, 19500, 21000, 22500, 24000, 25500, 27000],
                    borderColor: '#f3ef56',
                    backgroundColor: 'rgba(243, 239, 86, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Services',
                    data: [8500, 9200, 10500, 11800, 13000, 14200, 15800, 17000, 18500, 20000, 21500, 23000],
                    borderColor: '#6495ed',
                    backgroundColor: 'rgba(100, 149, 237, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
});

function fetchDashboardStats() {
    fetch('/admin/dashboard-stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.stats;
                // Update stats cards
                document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
                document.getElementById('totalVendors').textContent = stats.totalVendors || 0;
                // Event Managers is hardcoded
                document.getElementById('totalEventManagers').textContent = 43;

                // Initialize User Distribution Chart with dynamic data
                const userDistributionCtx = document.getElementById('userDistributionChart').getContext('2d');
                const userDistributionChart = new Chart(userDistributionCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Users', 'Service Providers', 'Shop Vendors', 'Event Managers'],
                        datasets: [{
                            data: [stats.totalUsers || 0, 0, stats.totalVendors || 0, 0],
                            backgroundColor: [
                                '#f3ef56',
                                '#8fbc8f',
                                '#6495ed',
                                '#ff9999'
                            ],
                            borderColor: [
                                '#f3ef56',
                                '#8fbc8f',
                                '#6495ed',
                                '#ff9999'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.raw !== null) {
                                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                            const percentage = Math.round((context.raw / total) * 100);
                                            label += context.raw + ' (' + percentage + '%)';
                                        }
                                        return label;
                                    }
                                }
                            }
                        },
                        cutout: '70%'
                    }
                });
            } else {
                console.error('Failed to fetch dashboard stats:', data.message);
                // Fallback values in case of error
                document.getElementById('totalUsers').textContent = 'Error';
                document.getElementById('totalVendors').textContent = 'Error';
                document.getElementById('totalEventManagers').textContent = 43;
            }
        })
        .catch(error => {
            console.error('Error fetching dashboard stats:', error);
            // Fallback values in case of error
            document.getElementById('totalUsers').textContent = 'Error';
            document.getElementById('totalVendors').textContent = 'Error';
            document.getElementById('totalEventManagers').textContent = 43;
        });
}


function fetchRecentUsers() {
    fetch('/admin/get-users')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('recentUsersTableBody');
            tbody.innerHTML = ''; // Clear the "Loading..." placeholder

            if (data.success && data.users.length > 0) {
                data.users.forEach(user => {
                    // Format the joined_date to a readable format (e.g., "Mar 10, 2025")
                    const joinedDate = new Date(user.joined_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric'
                    });

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>User</td>
                        <td>${joinedDate}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                // If no users are found or the request fails, show a message
                tbody.innerHTML = '<tr><td colspan="4">No recent users found</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching recent users:', error);
            const tbody = document.getElementById('recentUsersTableBody');
            tbody.innerHTML = '<tr><td colspan="4">Error loading users</td></tr>';
        });
}