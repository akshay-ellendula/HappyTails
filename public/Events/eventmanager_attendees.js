 document.addEventListener('DOMContentLoaded', () => {
            /**
             * Sets up a real-time, column-specific filter for a table.
             * @param {string} inputId The ID of the input field.
             * @param {string} selectId The ID of the column selector dropdown.
             * @param {string} tableId The ID of the table to filter.
             */
            const setupFilter = (inputId, selectId, tableId) => {
                const filterInput = document.getElementById(inputId);
                const columnSelect = document.getElementById(selectId);
                const table = document.getElementById(tableId);

                if (!filterInput || !columnSelect || !table) {
                    console.warn(`Filter setup failed for table '${tableId}'. One or more elements not found.`);
                    return;
                }

                const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

                const applyFilter = () => {
                    const filterText = filterInput.value.toUpperCase();
                    const columnIndex = columnSelect.value;

                    for (const row of rows) {
                        let match = false;
                        if (columnIndex === "all") {
                            // Search all cells in the row if "All Columns" is selected
                            const rowText = row.textContent || row.innerText;
                            if (rowText.toUpperCase().indexOf(filterText) > -1) {
                                match = true;
                            }
                        } else {
                            // Search only the selected column's cell
                            const cell = row.getElementsByTagName('td')[columnIndex];
                            if (cell) {
                                const cellText = cell.textContent || cell.innerText;
                                if (cellText.toUpperCase().indexOf(filterText) > -1) {
                                    match = true;
                                }
                            }
                        }
                        
                        // Show or hide the row based on whether a match was found
                        row.style.display = match ? '' : 'none';
                    }
                };

                // Apply the filter whenever the user types or changes the column
                filterInput.addEventListener('keyup', applyFilter);
                columnSelect.addEventListener('change', applyFilter);
            };

            // Initialize the filters for both tables
            setupFilter('pastOngoingFilter', 'pastOngoingColumn', 'pastOngoingTable');
            setupFilter('upcomingFilter', 'upcomingColumn', 'upcomingTable');
        });