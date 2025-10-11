 // Function to convert 24-hour time to 12-hour format
                function convertTo12Hour(time) {
                    const [hours, minutes] = time.split(':').map(Number);
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const adjustedHours = hours % 12 || 12; // Convert 0 to 12 for midnight
                    return `${adjustedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                }
                // MODIFIED: Updated the deleteEvent function
                async function deleteEvent(eventId, event) {
                    // This stops the click from triggering other actions, like navigating a link
                    if(event) event.stopPropagation();

                    if (!confirm('Are you sure you want to delete this event? This will also delete all associated attendees.')) return;

                    try {
                        // Use the correct API path for your backend
                        const response = await fetch(`/api/deleteEvent/${eventId}`, {
                            method: 'DELETE'
                        });

                        const data = await response.json();

                        if (response.ok) {
                            alert('Event deleted successfully!');
                            // Reload the page to see the changes
                            window.location.reload();
                        } else {
                            alert('Failed to delete event: ' + data.message);
                        }
                    } catch (error) {
                        console.error('Error deleting event:', error);
                        alert('An error occurred while deleting the event.');
                    }
                }