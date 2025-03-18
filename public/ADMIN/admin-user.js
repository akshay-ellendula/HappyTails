        // Sample user data
        const users = [
            { id: 'USR001', name: 'John Doe', email: 'john.doe@example.com', joinedDate: 'Feb 12, 2025' },
            { id: 'USR002', name: 'Jane Smith', email: 'jane.smith@example.com', joinedDate: 'Feb 10, 2025' },
            { id: 'USR003', name: 'Robert Johnson', email: 'robert.j@example.com', joinedDate: 'Feb 5, 2025' },
            { id: 'USR004', name: 'Emily Wilson', email: 'emily.w@example.com', joinedDate: 'Jan 28, 2025' },
            { id: 'USR005', name: 'Michael Brown', email: 'm.brown@example.com', joinedDate: 'Jan 25, 2025' },
            { id: 'USR006', name: 'Sarah Davis', email: 'sarah.d@example.com', joinedDate: 'Jan 20, 2025' },
            { id: 'USR007', name: 'David Miller', email: 'david.m@example.com', joinedDate: 'Jan 18, 2025' },
            { id: 'USR008', name: 'Jessica Taylor', email: 'jessica.t@example.com', joinedDate: 'Jan 15, 2025' }
        ];
        
        // Additional user details (can be stored in localStorage or accessed via API in a real application)
        const userDetails = {
            'USR001': {
                address: '123 Main St, New York, NY',
                phone: '(555) 123-4567',
                lastLogin: 'Mar 15, 2025, 10:23 AM',
                preferredPets: 'Dogs, Cats',
                previousOrders: 3,
                membershipType: 'Premium'
            },
            'USR002': {
                address: '456 Oak Ave, Chicago, IL',
                phone: '(555) 234-5678',
                lastLogin: 'Mar 14, 2025, 2:45 PM',
                preferredPets: 'Birds',
                previousOrders: 1,
                membershipType: 'Standard'
            },
            'USR003': {
                address: '789 Pine St, San Francisco, CA',
                phone: '(555) 345-6789',
                lastLogin: 'Mar 16, 2025, 9:15 AM',
                preferredPets: 'Dogs',
                previousOrders: 5,
                membershipType: 'Premium'
            },
            'USR004': {
                address: '101 Maple Dr, Boston, MA',
                phone: '(555) 456-7890',
                lastLogin: 'Mar 10, 2025, 11:30 AM',
                preferredPets: 'Cats',
                previousOrders: 0,
                membershipType: 'Standard'
            },
            'USR005': {
                address: '202 Cedar Ln, Austin, TX',
                phone: '(555) 567-8901',
                lastLogin: 'Mar 15, 2025, 5:45 PM',
                preferredPets: 'Reptiles',
                previousOrders: 2,
                membershipType: 'Standard'
            },
            'USR006': {
                address: '303 Birch Rd, Seattle, WA',
                phone: '(555) 678-9012',
                lastLogin: 'Mar 5, 2025, 3:20 PM',
                preferredPets: 'Dogs, Fish',
                previousOrders: 1,
                membershipType: 'Standard'
            },
            'USR007': {
                address: '404 Elm St, Denver, CO',
                phone: '(555) 789-0123',
                lastLogin: 'Mar 14, 2025, 8:10 AM',
                preferredPets: 'Small Mammals',
                previousOrders: 4,
                membershipType: 'Premium'
            },
            'USR008': {
                address: '505 Walnut Ave, Miami, FL',
                phone: '(555) 890-1234',
                lastLogin: 'Mar 13, 2025, 1:05 PM',
                preferredPets: 'Dogs, Cats',
                previousOrders: 2,
                membershipType: 'Standard'
            }
        };
        
        
        
        
        // Load users when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            displayUsers(users);
            setupEventListeners();
        });
        
        // Display users in the table
        function displayUsers(usersToDisplay) {
            userTableBody.innerHTML = '';
            
            usersToDisplay.forEach(user => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>#${user.id}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.joinedDate}</td>
                    <td>
                        <a href="admin-user-details?id=${user.id}" class="action-btn">View</a>
                    </td>
                `;
                
                userTableBody.appendChild(row);
            });
        }
        
        // Filter users based on search input
        function filterUsers() {
            const searchTerm = userSearchInput.value.toLowerCase();
            
            if (searchTerm === '') {
                displayUsers(users);
                return;
            }
            
            const filteredUsers = users.filter(user => 
                user.name.toLowerCase().includes(searchTerm) || 
                user.email.toLowerCase().includes(searchTerm)
            );
            
            displayUsers(filteredUsers);
        }
        
        // Set up event listeners
        function setupEventListeners() {
            userSearchInput.addEventListener('input', filterUsers);
            
            filterBtn.addEventListener('click', function() {
                // Implement filter functionality here
                alert('Filter functionality coming soon!');
            });
        }
        
        