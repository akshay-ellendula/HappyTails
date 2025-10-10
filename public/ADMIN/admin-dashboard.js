document.addEventListener('DOMContentLoaded', function() {
    // Fetch dashboard stats and recent entities
    fetchDashboardStats();
    fetchRecentUsers();

    // Fetch revenue chart data dynamically
    fetch('/admin/revenue-chart-data')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const chartData = data.chartData;
                // Initialize Revenue Chart with dynamic data
                const revenueChartCtx = document.getElementById('revenueChart').getContext('2d');
                const revenueChart = new Chart(revenueChartCtx, {
                    type: 'line',
                    data: {
                        labels: chartData.labels, // Dynamic months
                        datasets: [
                            {
                                label: 'Pet Sales',
                                data: chartData.petSales, // Dynamic data
                                borderColor: '#8fbc8f',
                                backgroundColor: 'rgba(143, 188, 143, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4
                            },
                            {
                                label: 'Products',
                                data: chartData.products, // Dynamic data
                                borderColor: '#f3ef56',
                                backgroundColor: 'rgba(243, 239, 86, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4
                            },
                            {
                                label: 'Services',
                                data: chartData.services, // Dynamic data
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
            } else {
                console.error('Failed to fetch revenue chart data:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching revenue chart data:', error);
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
                document.getElementById('totalEventManagers').textContent = stats.totalEventManagers || 0;
                document.getElementById('totalEvents').textContent = stats.totalEvents || 0; // Add this line
                // Update revenue stats
                document.getElementById('totalRevenue').textContent = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(stats.totalRevenue || 0);
                document.getElementById('monthlyRevenue').textContent = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(stats.monthlyRevenue || 0);
                document.getElementById('weeklyRevenue').textContent = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(stats.weeklyRevenue || 0);
                document.getElementById('dailyRevenue').textContent = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(stats.dailyRevenue || 0);

                // Update percentage labels
                document.getElementById('userGrowthPercent').textContent = 
                    (stats.userGrowthPercent >= 0 ? '+' : '') + stats.userGrowthPercent + '% from last month';
                document.getElementById('vendorGrowthPercent').textContent = 
                    (stats.vendorGrowthPercent >= 0 ? '+' : '') + stats.vendorGrowthPercent + '% from last month';
                document.getElementById('eventManagerGrowthPercent').textContent = 
                    (stats.eventManagerGrowthPercent >= 0 ? '+' : '') + stats.eventManagerGrowthPercent + '% from last month';
                document.getElementById('monthlyRevenueGrowthPercent').textContent = 
                    (stats.monthlyRevenueGrowthPercent >= 0 ? '+' : '') + stats.monthlyRevenueGrowthPercent + '% from last month';
                document.getElementById('weeklyRevenueGrowthPercent').textContent = 
                    (stats.weeklyRevenueGrowthPercent >= 0 ? '+' : '') + stats.weeklyRevenueGrowthPercent + '% from last week';
                document.getElementById('dailyRevenueGrowthPercent').textContent = 
                    (stats.dailyRevenueGrowthPercent >= 0 ? '+' : '') + stats.dailyRevenueGrowthPercent + '% from yesterday';

                // Initialize User Distribution Chart with dynamic data
                const userDistributionCtx = document.getElementById('userDistributionChart').getContext('2d');
                const userDistributionChart = new Chart(userDistributionCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Users', 'Service Providers', 'Shop Vendors', 'Event Managers'],
                        datasets: [{
                            data: [stats.totalUsers || 0, 0, stats.totalVendors || 0, stats.totalEventManagers || 0],
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
                document.getElementById('totalEventManagers').textContent = 'Error';
                document.getElementById('totalRevenue').textContent = 'Error';
                document.getElementById('monthlyRevenue').textContent = 'Error';
                document.getElementById('weeklyRevenue').textContent = 'Error';
                document.getElementById('dailyRevenue').textContent = 'Error';
            }
        })
        .catch(error => {
            console.error('Error fetching dashboard stats:', error);
            // Fallback values in case of error
            document.getElementById('totalUsers').textContent = 'Error';
            document.getElementById('totalVendors').textContent = 'Error';
            document.getElementById('totalEventManagers').textContent = 'Error';
            document.getElementById('totalRevenue').textContent = 'Error';
            document.getElementById('monthlyRevenue').textContent = 'Error';
            document.getElementById('weeklyRevenue').textContent = 'Error';
            document.getElementById('dailyRevenue').textContent = 'Error';
        });
}

function fetchRecentUsers() {
    fetch('/admin/get-users')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('recentUsersTableBody');
                tbody.innerHTML = ''; // Clear existing rows
                data.users.forEach(user => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>User</td>
                        <td>${new Date(user.joined_date).toLocaleDateString()}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                console.error('Failed to fetch recent users:', data.message);
                document.getElementById('recentUsersTableBody').innerHTML = '<tr><td colspan="4">Error loading users</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error fetching recent users:', error);
            document.getElementById('recentUsersTableBody').innerHTML = '<tr><td colspan="4">Error loading users</td></tr>';
        });
}