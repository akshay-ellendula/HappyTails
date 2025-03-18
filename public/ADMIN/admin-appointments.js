// Sample appointment data
const appointments = [
    { 
        id: 'APT001', 
        clientName: 'John Smith', 
        petName: 'Max', 
        serviceType: 'Veterinary Checkup',
        provider: 'Dr. Sarah Johnson',
        dateTime: 'Mar 18, 2025 10:00 AM',
        status: 'scheduled'
    },
    { 
        id: 'APT002', 
        clientName: 'Emily Davis', 
        petName: 'Luna', 
        serviceType: 'Grooming',
        provider: 'Alex Wilson',
        dateTime: 'Mar 18, 2025 2:30 PM',
        status: 'scheduled'
    },
    { 
        id: 'APT003', 
        clientName: 'Michael Johnson', 
        petName: 'Bailey', 
        serviceType: 'Training Session',
        provider: 'Robert Phillips',
        dateTime: 'Mar 19, 2025 9:15 AM',
        status: 'scheduled'
    },
    { 
        id: 'APT004', 
        clientName: 'Lisa Thompson', 
        petName: 'Charlie', 
        serviceType: 'Veterinary Vaccination',
        provider: 'Dr. James Miller',
        dateTime: 'Mar 17, 2025 11:30 AM',
        status: 'completed'
    },
    { 
        id: 'APT005', 
        clientName: 'David Wilson', 
        petName: 'Bella', 
        serviceType: 'Dental Cleaning',
        provider: 'Dr. Sarah Johnson',
        dateTime: 'Mar 16, 2025 3:00 PM',
        status: 'completed'
    },
    { 
        id: 'APT006', 
        clientName: 'Sarah Brown', 
        petName: 'Rocky', 
        serviceType: 'Grooming',
        provider: 'Alex Wilson',
        dateTime: 'Mar 16, 2025 10:45 AM',
        status: 'cancelled'
    },
    { 
        id: 'APT007', 
        clientName: 'Jennifer Lee', 
        petName: 'Milo', 
        serviceType: 'Advanced Training',
        provider: 'Robert Phillips',
        dateTime: 'Mar 17, 2025 4:15 PM',
        status: 'in-progress'
    },
    { 
        id: 'APT008', 
        clientName: 'Thomas Garcia', 
        petName: 'Coco', 
        serviceType: 'Health Assessment',
        provider: 'Dr. James Miller',
        dateTime: 'Mar 15, 2025 9:00 AM',
        status: 'completed'
    }
];

// Additional appointment details (can be stored in localStorage or accessed via API in a real application)
const appointmentDetails = {
    'APT001': {
        clientPhone: '(555) 123-4567',
        clientEmail: 'john.smith@email.com',
        petSpecies: 'Dog',
        petBreed: 'Golden Retriever',
        petAge: '3 years',
        serviceDescription: 'Annual wellness examination and vaccination update',
        notes: 'Pet has slight allergies to certain treats',
        appointmentDuration: '30 minutes',
        cost: '$65.00',
        paymentStatus: 'Pending'
    },
    'APT002': {
        clientPhone: '(555) 987-6543',
        clientEmail: 'emily.davis@email.com',
        petSpecies: 'Cat',
        petBreed: 'Maine Coon',
        petAge: '2 years',
        serviceDescription: 'Full grooming service including nail trimming',
        notes: 'Pet gets nervous during baths',
        appointmentDuration: '60 minutes',
        cost: '$45.00',
        paymentStatus: 'Paid'
    },
    'APT003': {
        clientPhone: '(555) 456-7890',
        clientEmail: 'michael.johnson@email.com',
        petSpecies: 'Dog',
        petBreed: 'Border Collie',
        petAge: '1 year',
        serviceDescription: 'Basic obedience training',
        notes: 'Owner wants to focus on recall commands',
        appointmentDuration: '45 minutes',
        cost: '$55.00',
        paymentStatus: 'Pending'
    },
    'APT004': {
        clientPhone: '(555) 234-5678',
        clientEmail: 'lisa.thompson@email.com',
        petSpecies: 'Dog',
        petBreed: 'Beagle',
        petAge: '4 years',
        serviceDescription: 'Annual vaccinations',
        notes: 'Pet is up to date on all shots except rabies',
        appointmentDuration: '20 minutes',
        cost: '$40.00',
        paymentStatus: 'Paid'
    },
    'APT005': {
        clientPhone: '(555) 876-5432',
        clientEmail: 'david.wilson@email.com',
        petSpecies: 'Dog',
        petBreed: 'Poodle',
        petAge: '5 years',
        serviceDescription: 'Dental cleaning and assessment',
        notes: 'Pet has history of dental issues, use gentle approach',
        appointmentDuration: '45 minutes',
        cost: '$90.00',
        paymentStatus: 'Paid'
    },
    'APT006': {
        clientPhone: '(555) 345-6789',
        clientEmail: 'sarah.brown@email.com',
        petSpecies: 'Dog',
        petBreed: 'German Shepherd',
        petAge: '3 years',
        serviceDescription: 'Full grooming service with de-shedding treatment',
        notes: 'Cancelled due to owner illness, reschedule next week',
        appointmentDuration: '75 minutes',
        cost: '$60.00',
        paymentStatus: 'Refunded'
    },
    'APT007': {
        clientPhone: '(555) 567-8901',
        clientEmail: 'jennifer.lee@email.com',
        petSpecies: 'Dog',
        petBreed: 'Australian Shepherd',
        petAge: '2 years',
        serviceDescription: 'Advanced training for agility performance',
        notes: 'Second session of a 6-part training program',
        appointmentDuration: '60 minutes',
        cost: '$70.00',
        paymentStatus: 'Paid'
    },
    'APT008': {
        clientPhone: '(555) 678-9012',
        clientEmail: 'thomas.garcia@email.com',
        petSpecies: 'Cat',
        petBreed: 'Siamese',
        petAge: '7 years',
        serviceDescription: 'Senior pet health assessment',
        notes: 'Follow-up bloodwork may be needed',
        appointmentDuration: '40 minutes',
        cost: '$85.00',
        paymentStatus: 'Paid'
    }
};



// Load appointments when the page loads
document.addEventListener('DOMContentLoaded', function() {
    displayAppointments(appointments);
    setupEventListeners();
});

// Display appointments in the table
function displayAppointments(appointmentsToDisplay) {
    appointmentTableBody.innerHTML = '';
    
    appointmentsToDisplay.forEach(appointment => {
        const row = document.createElement('tr');
        
        // Capitalize first letter of status
        const statusText = appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);
        
        row.innerHTML = `
            <td>#${appointment.id}</td>
            <td>${appointment.clientName}</td>
            <td>${appointment.petName}</td>
            <td>${appointment.serviceType}</td>
            <td>${appointment.provider}</td>
            <td>${appointment.dateTime}</td>
            <td>${statusText}</td>
            <td>
                <a href="appointment-details?id=${appointment.id}" class="action-btn">View</a>
                <a href="#" class="action-btn edit-appointment" data-id="${appointment.id}">Edit</a>
            </td>
        `;
        
        appointmentTableBody.appendChild(row);
    });

    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-appointment').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const appointmentId = this.getAttribute('data-id');
            editAppointment(appointmentId);
        });
    });
}

// Filter appointments based on search input
function filterAppointments() {
    const searchTerm = appointmentSearchInput.value.toLowerCase();
    
    if (searchTerm === '') {
        displayAppointments(appointments);
        return;
    }
    
    const filteredAppointments = appointments.filter(appointment => 
        appointment.clientName.toLowerCase().includes(searchTerm) || 
        appointment.id.toLowerCase().includes(searchTerm) || 
        appointment.petName.toLowerCase().includes(searchTerm) ||
        appointment.provider.toLowerCase().includes(searchTerm) ||
        appointment.serviceType.toLowerCase().includes(searchTerm)
    );
    
    displayAppointments(filteredAppointments);
}

// Edit appointment function
function editAppointment(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
        // In a real application, this would open an edit form
        alert(`Editing appointment: ${appointment.id} - ${appointment.clientName} with ${appointment.provider}`);
    }
}

// Add new appointment function
function addNewAppointment() {
    
    alert('Add new appointment form will open here');
}

// Set up event listeners
function setupEventListeners() {
    if (appointmentSearchInput) {
        appointmentSearchInput.addEventListener('input', filterAppointments);
    }
    
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            // Implement filter functionality here
            alert('Filter options: By date range, service type, provider, or status');
        });
    }

    if (addAppointmentBtn) {
        addAppointmentBtn.addEventListener('click', addNewAppointment);
    }
}
