        // Sample event manager data
        const eventManagers = [
            { id: 'EM001', name: 'Sarah Johnson', organization: 'Paws For A Cause', email: 'sarah@pawsforacause.org', joinedDate: 'Jan 5, 2025' },
            { id: 'EM002', name: 'Robert Chen', organization: 'Pet Adoption Network', email: 'robert@petadoption.org', joinedDate: 'Jan 11, 2025' },
            { id: 'EM003', name: 'Jessica Williams', organization: 'Animal Welfare Society', email: 'jessica@aws.org', joinedDate: 'Jan 17, 2025' },
            { id: 'EM004', name: 'Marcus Brown', organization: 'Happy Paws Foundation', email: 'marcus@happypaws.org', joinedDate: 'Jan 23, 2025' },
            { id: 'EM005', name: 'Aisha Martinez', organization: 'Pet Health Awareness', email: 'aisha@pethealth.org', joinedDate: 'Jan 29, 2025' },
            { id: 'EM006', name: 'Tyler Washington', organization: 'Dog Training Association', email: 'tyler@dogtraining.org', joinedDate: 'Feb 4, 2025' },
            { id: 'EM007', name: 'Olivia Garcia', organization: 'Cat Lovers Club', email: 'olivia@catlovers.org', joinedDate: 'Feb 9, 2025' },
            { id: 'EM008', name: 'Jordan Rodriguez', organization: 'Exotic Pets Hub', email: 'jordan@exoticpets.org', joinedDate: 'Feb 15, 2025' }
        ];
        
        // Additional event manager details (can be stored in localStorage or accessed via API in a real application)
        const eventManagerDetails = {
            'EM001': {
                address: '123 Charity Lane, Portland, OR',
                phone: '(555) 111-2233',
                eventType: 'Adoption Events',
                rating: 4.9,
                totalEvents: 45,
                revenue: '$24,750',
                activeStatus: 'Active',
                upcomingEvents: [
                    { name: 'Spring Pet Adoption Fair', date: 'Mar 20, 2025', location: 'Central Park', attendees: 250 },
                    { name: 'Pet Health Seminar', date: 'Mar 28, 2025', location: 'Community Center', attendees: 120 }
                ]
            },
            'EM002': {
                address: '456 Rescue Road, Seattle, WA',
                phone: '(555) 222-3344',
                eventType: 'Educational Workshops',
                rating: 4.7,
                totalEvents: 38,
                revenue: '$19,450',
                activeStatus: 'Active',
                upcomingEvents: [
                    { name: 'Pet First Aid Workshop', date: 'Mar 22, 2025', location: 'Seattle Convention Center', attendees: 180 },
                    { name: 'New Pet Owner Training', date: 'Apr 5, 2025', location: 'Public Library', attendees: 90 }
                ]
            },
            'EM003': {
                address: '789 Wildlife Blvd, Chicago, IL',
                phone: '(555) 333-4455',
                eventType: 'Fundraising Events',
                rating: 4.8,
                totalEvents: 52,
                revenue: '$32,600',
                activeStatus: 'Active',
                upcomingEvents: [
                    { name: 'Annual Pet Charity Gala', date: 'Mar 25, 2025', location: 'Grand Hotel', attendees: 350 },
                    { name: 'Pet Walk-a-thon', date: 'Apr 10, 2025', location: 'Riverside Park', attendees: 500 }
                ]
            },
            'EM004': {
                address: '101 Foundation Ave, Boston, MA',
                phone: '(555) 444-5566',
                eventType: 'Competitions & Shows',
                rating: 4.6,
                totalEvents: 29,
                revenue: '$15,870',
                activeStatus: 'Active',
                upcomingEvents: [
                    { name: 'Spring Dog Show', date: 'Mar 30, 2025', location: 'Boston Exhibition Center', attendees: 420 },
                    { name: 'Pet Talent Competition', date: 'Apr 15, 2025', location: 'City Auditorium', attendees: 280 }
                ]
            },
            'EM005': {
                address: '202 Health Street, San Francisco, CA',
                phone: '(555) 555-6677',
                eventType: 'Health Awareness',
                rating: 4.9,
                totalEvents: 41,
                revenue: '$22,350',
                activeStatus: 'Active',
                upcomingEvents: [
                    { name: 'Pet Vaccination Drive', date: 'Mar 18, 2025', location: 'Community Park', attendees: 300 },
                    { name: 'Senior Pet Health Seminar', date: 'Apr 8, 2025', location: 'Pet Wellness Center', attendees: 150 }
                ]
            },
            'EM006': {
                address: '303 Training Circle, Denver, CO',
                phone: '(555) 666-7788',
                eventType: 'Training Workshops',
                rating: 4.7,
                totalEvents: 35,
                revenue: '$17,900',
                activeStatus: 'Active',
                upcomingEvents: [
                    { name: 'Advanced Dog Training Workshop', date: 'Mar 23, 2025', location: 'Training Center', attendees: 80 },
                    { name: 'Puppy Socialization Day', date: 'Apr 12, 2025', location: 'Dog Park', attendees: 120 }
                ]
            },
            'EM007': {
                address: '404 Feline Road, Austin, TX',
                phone: '(555) 777-8899',
                eventType: 'Cat-specific Events',
                rating: 4.8,
                totalEvents: 27,
                revenue: '$13,580',
                activeStatus: 'Active',
                upcomingEvents: [
                    { name: 'Cat Adoption Festival', date: 'Mar 27, 2025', location: 'City Hall Plaza', attendees: 220 },
                    { name: 'Cat Grooming Workshop', date: 'Apr 3, 2025', location: 'Pet Supply Store', attendees: 75 }
                ]
            },
            'EM008': {
                address: '505 Exotic Ave, Miami, FL',
                phone: '(555) 888-9900',
                eventType: 'Exotic Pet Events',
                rating: 4.5,
                totalEvents: 22,
                revenue: '$10,450',
                activeStatus: 'Active',
                upcomingEvents: [
                    { name: 'Reptile Expo', date: 'Mar 29, 2025', location: 'Convention Center', attendees: 180 },
                    { name: 'Small Animal Care Workshop', date: 'Apr 18, 2025', location: 'Natural History Museum', attendees: 95 }
                ]
            }
        };
        
        
        // Load event managers when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            displayEventManagers(eventManagers);
            setupEventListeners();
        });
        
        // Display event managers in the table
        function displayEventManagers(managersToDisplay) {
            eventManagerTableBody.innerHTML = '';
            
            managersToDisplay.forEach(manager => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>#${manager.id}</td>
                    <td>${manager.name}</td>
                    <td>${manager.organization}</td>
                    <td>${manager.email}</td>
                    <td>${manager.joinedDate}</td>
                    <td>
                        <a href="admin-em-details?id=${manager.id}" class="action-btn">View</a>
                    </td>
                `;
                
                eventManagerTableBody.appendChild(row);
            });
        }
        
        // Filter event managers based on search input
        function filterEventManagers() {
            const searchTerm = eventManagerSearchInput.value.toLowerCase();
            
            if (searchTerm === '') {
                displayEventManagers(eventManagers);
                return;
            }
            
            const filteredManagers = eventManagers.filter(manager => 
                manager.name.toLowerCase().includes(searchTerm) || 
                manager.email.toLowerCase().includes(searchTerm) || 
                manager.organization.toLowerCase().includes(searchTerm) ||
                (eventManagerDetails[manager.id] && 
                 eventManagerDetails[manager.id].eventType && 
                 eventManagerDetails[manager.id].eventType.toLowerCase().includes(searchTerm))
            );
            
            displayEventManagers(filteredManagers);
        }
        
        // Set up event listeners
        function setupEventListeners() {
            eventManagerSearchInput.addEventListener('input', filterEventManagers);
            
            filterBtn.addEventListener('click', function() {
                // Implement filter functionality here
                alert('Filter functionality coming soon!');
            });
        }