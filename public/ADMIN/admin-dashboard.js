document.addEventListener('DOMContentLoaded', function() {
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

    // Initialize User Distribution Chart
    const userDistributionCtx = document.getElementById('userDistributionChart').getContext('2d');
    const userDistributionChart = new Chart(userDistributionCtx, {
        type: 'doughnut',
        data: {
            labels: ['Users', 'Service Providers', 'Shop Vendors', 'Event Managers'],
            datasets: [{
                data: [1452, 248, 87, 43],
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


});