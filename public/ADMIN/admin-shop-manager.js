    // Sample shop manager data
    const managers = [
        { id: 'SM001', name: 'Emily Johnson', shopName: 'Paws & Claws Pet Shop', email: 'emily@pawsclaws.com', joinedDate: 'Jan 3, 2025' },
        { id: 'SM002', name: 'Michael Chen', shopName: 'Furry Friends Supplies', email: 'michael@furryfriends.com', joinedDate: 'Jan 8, 2025' },
        { id: 'SM003', name: 'Sophia Williams', shopName: 'Pet Essentials', email: 'sophia@petessentials.com', joinedDate: 'Jan 12, 2025' },
        { id: 'SM004', name: 'Daniel Brown', shopName: 'Happy Pets Store', email: 'daniel@happypets.com', joinedDate: 'Jan 18, 2025' },
        { id: 'SM005', name: 'Olivia Martinez', shopName: 'Premium Pet Products', email: 'olivia@premiumpet.com', joinedDate: 'Jan 25, 2025' },
        { id: 'SM006', name: 'Noah Taylor', shopName: 'Healthy Paws Market', email: 'noah@healthypaws.com', joinedDate: 'Feb 2, 2025' },
        { id: 'SM007', name: 'Emma Garcia', shopName: 'Pet Luxury Boutique', email: 'emma@petluxury.com', joinedDate: 'Feb 10, 2025' },
        { id: 'SM008', name: 'Liam Rodriguez', shopName: 'Aqua Pet World', email: 'liam@aquapet.com', joinedDate: 'Feb 16, 2025' }
    ];
    
    // Additional manager details (can be stored in localStorage or accessed via API in a real application)
    const managerDetails = {
        'SM001': {
            address: '123 Pet Shop Lane, Portland, OR',
            phone: '(555) 123-4567',
            shopType: 'General Pet Supplies',
            rating: 4.7,
            totalOrders: 287,
            revenue: '$32,450',
            activeStatus: 'Active'
        },
        'SM002': {
            address: '456 Animal Ave, Seattle, WA',
            phone: '(555) 234-5678',
            shopType: 'Pet Food & Treats',
            rating: 4.8,
            totalOrders: 342,
            revenue: '$38,750',
            activeStatus: 'Active'
        },
        'SM003': {
            address: '789 Pet Blvd, Chicago, IL',
            phone: '(555) 345-6789',
            shopType: 'Essential Pet Accessories',
            rating: 4.6,
            totalOrders: 198,
            revenue: '$21,320',
            activeStatus: 'Active'
        },
        'SM004': {
            address: '101 Happy Lane, Boston, MA',
            phone: '(555) 456-7890',
            shopType: 'Pet Toys & Games',
            rating: 4.5,
            totalOrders: 176,
            revenue: '$15,980',
            activeStatus: 'Active'
        },
        'SM005': {
            address: '202 Premium Drive, San Francisco, CA',
            phone: '(555) 567-8901',
            shopType: 'Premium Pet Products',
            rating: 4.9,
            totalOrders: 243,
            revenue: '$29,780',
            activeStatus: 'Active'
        },
        'SM006': {
            address: '303 Health Street, Denver, CO',
            phone: '(555) 678-9012',
            shopType: 'Organic Pet Products',
            rating: 4.7,
            totalOrders: 154,
            revenue: '$18,450',
            activeStatus: 'Active'
        },
        'SM007': {
            address: '404 Luxury Road, Austin, TX',
            phone: '(555) 789-0123',
            shopType: 'Premium Pet Accessories',
            rating: 4.8,
            totalOrders: 187,
            revenue: '$24,650',
            activeStatus: 'Active'
        },
        'SM008': {
            address: '505 Aquarium Blvd, Miami, FL',
            phone: '(555) 890-1234',
            shopType: 'Aquarium & Fish Supplies',
            rating: 4.6,
            totalOrders: 112,
            revenue: '$12,870',
            activeStatus: 'Active'
        }
    };
    
    
    
    // Load managers when the page loads
    document.addEventListener('DOMContentLoaded', function() {
        displayManagers(managers);
        setupEventListeners();
    });
    
    // Display managers in the table
    function displayManagers(managersToDisplay) {
        managerTableBody.innerHTML = '';
        
        managersToDisplay.forEach(manager => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>#${manager.id}</td>
                <td>${manager.name}</td>
                <td>${manager.shopName}</td>
                <td>${manager.email}</td>
                <td>${manager.joinedDate}</td>
                <td>
                    <a href="admin-sm-details?id=${manager.id}" class="action-btn">View</a>
                </td>
            `;
            
            managerTableBody.appendChild(row);
        });
    }
    
    // Filter managers based on search input
    function filterManagers() {
        const searchTerm = managerSearchInput.value.toLowerCase();
        
        if (searchTerm === '') {
            displayManagers(managers);
            return;
        }
        
        const filteredManagers = managers.filter(manager => 
            manager.name.toLowerCase().includes(searchTerm) || 
            manager.email.toLowerCase().includes(searchTerm) || 
            manager.shopName.toLowerCase().includes(searchTerm) ||
            (managerDetails[manager.id] && 
             managerDetails[manager.id].shopType && 
             managerDetails[manager.id].shopType.toLowerCase().includes(searchTerm))
        );
        
        displayManagers(filteredManagers);
    }
    
    // Set up event listeners
    function setupEventListeners() {
        managerSearchInput.addEventListener('input', filterManagers);
        
        filterBtn.addEventListener('click', function() {
            // Implement filter functionality here
            alert('Filter functionality coming soon!');
        });
    }
    
    
    
    