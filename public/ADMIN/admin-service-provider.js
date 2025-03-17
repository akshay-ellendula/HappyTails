        // Sample service provider data
        const providers = [
            { id: 'SP001', name: 'Pet Paradise Grooming', email: 'info@petparadise.com', joinedDate: 'Jan 5, 2025' },
            { id: 'SP002', name: 'Dr. Maria Cooper', email: 'dr.cooper@vetcare.com', joinedDate: 'Jan 10, 2025' },
            { id: 'SP003', name: 'Paws & Relax Spa', email: 'bookings@pawsrelax.com', joinedDate: 'Jan 15, 2025' },
            { id: 'SP004', name: 'Happy Walk Dog Services', email: 'schedule@happywalk.com', joinedDate: 'Jan 22, 2025' },
            { id: 'SP005', name: 'Dr. James Wilson', email: 'james@pethealth.com', joinedDate: 'Jan 30, 2025' },
            { id: 'SP006', name: 'Feline Friends Cattery', email: 'stay@felinefriends.com', joinedDate: 'Feb 5, 2025' },
            { id: 'SP007', name: 'Pawsome Training', email: 'train@pawsome.com', joinedDate: 'Feb 12, 2025' },
            { id: 'SP008', name: 'Aquatic Wonders', email: 'contact@aquaticwonders.com', joinedDate: 'Feb 18, 2025' }
        ];
        
        // Additional provider details (can be stored in localStorage or accessed via API in a real application)
        const providerDetails = {
            'SP001': {
                address: '456 Grooming Ave, Portland, OR',
                phone: '(555) 234-5678',
                services: 'Pet Grooming, Spa Treatments, Nail Trimming',
                rating: 4.8,
                totalAppointments: 342,
                revenue: '$15,670',
                activeStatus: 'Active'
            },
            'SP002': {
                address: '789 Veterinary Dr, Seattle, WA',
                phone: '(555) 345-6789',
                services: 'Veterinary Care, Vaccinations, General Checkups',
                rating: 4.9,
                totalAppointments: 512,
                revenue: '$28,450',
                activeStatus: 'Active'
            },
            'SP003': {
                address: '101 Relaxation Blvd, Chicago, IL',
                phone: '(555) 456-7890',
                services: 'Pet Massage, Aromatherapy, Relaxation Treatments',
                rating: 4.7,
                totalAppointments: 187,
                revenue: '$8,920',
                activeStatus: 'Active'
            },
            'SP004': {
                address: '202 Walking Path, Boston, MA',
                phone: '(555) 567-8901',
                services: 'Dog Walking, Pet Sitting, Play Dates',
                rating: 4.5,
                totalAppointments: 127,
                revenue: '$4,230',
                activeStatus: 'Active'
            },
            'SP005': {
                address: '303 Health Lane, San Francisco, CA',
                phone: '(555) 678-9012',
                services: 'Pet Health Consultations, Specialized Care',
                rating: 4.9,
                totalAppointments: 267,
                revenue: '$19,850',
                activeStatus: 'Active'
            },
            'SP006': {
                address: '404 Cat Street, Denver, CO',
                phone: '(555) 789-0123',
                services: 'Cat Boarding, Grooming, Cat Health',
                rating: 4.6,
                totalAppointments: 98,
                revenue: '$3,740',
                activeStatus: 'Active'
            },
            'SP007': {
                address: '505 Training Road, Austin, TX',
                phone: '(555) 890-1234',
                services: 'Obedience Training, Behavior Modification',
                rating: 4.8,
                totalAppointments: 156,
                revenue: '$8,920',
                activeStatus: 'Active'
            },
            'SP008': {
                address: '606 Aquarium Blvd, Miami, FL',
                phone: '(555) 901-2345',
                services: 'Aquarium Setup, Fish Health, Water Testing',
                rating: 4.4,
                totalAppointments: 62,
                revenue: '$2,870',
                activeStatus: 'Active'
            }
        };
        
        
        // Load providers when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            displayProviders(providers);
            setupEventListeners();
        });
        
        // Display providers in the table
        function displayProviders(providersToDisplay) {
            providerTableBody.innerHTML = '';
            
            providersToDisplay.forEach(provider => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>#${provider.id}</td>
                    <td>${provider.name}</td>
                    <td>${provider.email}</td>
                    <td>${provider.joinedDate}</td>
                    <td>
                        <a href="admin-sp-details?id=${provider.id}" class="action-btn">View</a>
                    </td>
                `;
                
                providerTableBody.appendChild(row);
            });
        }
        
        // Filter providers based on search input
        function filterProviders() {
            const searchTerm = providerSearchInput.value.toLowerCase();
            
            if (searchTerm === '') {
                displayProviders(providers);
                return;
            }
            
            const filteredProviders = providers.filter(provider => 
                provider.name.toLowerCase().includes(searchTerm) || 
                provider.email.toLowerCase().includes(searchTerm) ||
                (providerDetails[provider.id] && 
                 providerDetails[provider.id].services && 
                 providerDetails[provider.id].services.toLowerCase().includes(searchTerm))
            );
            
            displayProviders(filteredProviders);
        }
        
        // Set up event listeners
        function setupEventListeners() {
            providerSearchInput.addEventListener('input', filterProviders);
            
            filterBtn.addEventListener('click', function() {
                // Implement filter functionality here
                alert('Filter functionality coming soon!');
            });
        }
        