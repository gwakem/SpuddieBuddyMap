/**
 * Utility functions for the WorkBuddies Visualization
 * With security enhancements and proper encapsulation
 */

(function(window) {
    'use strict';
    
    // Create namespace for the application if it doesn't exist
    if (!window.WorkBuddies) {
        window.WorkBuddies = {};
    }
    
    // Utils namespace
    const utils = {
        /**
         * Sanitize a string to prevent XSS
         * @param {string} str - String to sanitize
         * @returns {string} - Sanitized string
         */
        sanitizeString: function(str) {
            if (typeof str !== 'string') return '';
            
            // Use DOMPurify if available, or fallback to basic sanitization
            if (typeof DOMPurify !== 'undefined') {
                return DOMPurify.sanitize(str, { ALLOWED_TAGS: [] });
            }
            
            // Basic sanitization fallback
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },
        
        /**
         * Create a DOM element with safe text content
         * @param {string} tag - Tag name for the element
         * @param {Object} options - Options for the element
         * @param {string} [options.text] - Text content for the element
         * @param {Object} [options.attributes] - Attributes for the element
         * @param {Array} [options.children] - Child elements
         * @param {Function} [options.onClick] - Click event handler
         * @returns {HTMLElement} - Created element
         */
        createSafeElement: function(tag, options = {}) {
            const element = document.createElement(tag);
            
            // Set text content safely
            if (options.text) {
                element.textContent = this.sanitizeString(options.text);
            }
            
            // Set attributes safely
            if (options.attributes) {
                for (const [key, value] of Object.entries(options.attributes)) {
                    // Skip on* attributes (event handlers should be added via addEventListener)
                    if (!key.startsWith('on')) {
                        element.setAttribute(key, this.sanitizeString(value));
                    }
                }
            }
            
            // Add children
            if (options.children) {
                options.children.forEach(child => {
                    if (child instanceof HTMLElement) {
                        element.appendChild(child);
                    }
                });
            }
            
            // Add click handler
            if (typeof options.onClick === 'function') {
                element.addEventListener('click', options.onClick);
            }
            
            return element;
        },
        
        /**
         * Init function to set up data store
         */
        init: function() {
            // Create data store if it doesn't exist
            if (!window.WorkBuddies.data) {
                window.WorkBuddies.data = {
                    raw: null,
                    filtered: null,
                    states: null,
                    activeTab: 'map',
                    isLoading: false,
                    lastFilterApplied: Date.now()
                };
                
                // For backward compatibility
                window.workBuddiesData = window.WorkBuddies.data;
            }
        },
        
        /**
         * Load and parse CSV data
         * @returns {Promise} Promise object representing the data
         */
        loadData: async function() {
            try {
                // Try to load data from the data folder
                let response = await fetch('data/data.csv');
                
                // If that fails, try alternative locations
                if (!response.ok) {
                    response = await fetch('./data.csv');
                }
                
                if (!response.ok) {
                    response = await fetch('../data.csv');
                }
                
                if (!response.ok) {
                    throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
                }
                
                const csvText = await response.text();
                
                // Use PapaParse for safer CSV parsing if available
                let data;
                if (typeof Papa !== 'undefined') {
                    const results = Papa.parse(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        transformHeader: header => this.sanitizeString(header.trim()),
                        transform: (value, header) => {
                            // Convert latitude and longitude to numbers
                            if (header.toLowerCase() === 'latitude' || header.toLowerCase() === 'longitude') {
                                const num = parseFloat(value);
                                return isNaN(num) ? 0 : num;
                            }
                            // Sanitize string values
                            return this.sanitizeString(value);
                        }
                    });
                    data = results.data;
                } else {
                    // Fallback to manual parsing with sanitization
                    const rows = csvText.trim().split('\n');
                    const headers = rows[0].split(',').map(header => this.sanitizeString(header.trim()));
                    
                    data = [];
                    for (let i = 1; i < rows.length; i++) {
                        const rowData = rows[i].split(',').map(cell => this.sanitizeString(cell.trim()));
                        
                        // Skip empty rows
                        if (rowData.length === 1 && rowData[0] === '') continue;
                        
                        // Skip rows with wrong number of columns
                        if (rowData.length !== headers.length) {
                            continue;
                        }
                        
                        const rowObj = {};
                        
                        headers.forEach((header, index) => {
                            // Convert latitude and longitude to numbers
                            if (header === 'latitude' || header === 'longitude') {
                                rowObj[header] = parseFloat(rowData[index]);
                                if (isNaN(rowObj[header])) {
                                    rowObj[header] = 0;
                                }
                            } else {
                                rowObj[header] = rowData[index];
                            }
                        });
                        
                        data.push(rowObj);
                    }
                }
                
                // Handle empty names
                data.forEach((item, index) => {
                    if (!item.WorkbuddyName) {
                        item.WorkbuddyName = `MysteriousSpuddy${1000 + index}`;
                    }
                });
                
                // Store raw data
                window.WorkBuddies.data.raw = data;
                window.WorkBuddies.data.filtered = [...data];
                
                // Extract unique states
                const statesSet = new Set(data.map(item => item.State).filter(state => state));
                window.WorkBuddies.data.states = Array.from(statesSet).sort();
                
                // Update total count
                const totalCountElement = document.getElementById('total-count');
                if (totalCountElement) {
                    totalCountElement.textContent = data.length;
                }
                
                // Populate state filter
                this.populateStateFilter();
                
                return data;
            } catch (error) {
                console.error('Error loading data');
                
                // In production, avoid showing detailed error messages
                throw new Error('Failed to load data. Please try again later.');
            }
        },
        
        /**
         * Populate the state filter dropdown
         */
        populateStateFilter: function() {
            const stateFilter = document.getElementById('state-filter');
            if (!stateFilter) return;
            
            // Clear existing options (except "All States")
            while (stateFilter.options.length > 1) {
                stateFilter.remove(1);
            }
            
            // Get states from data store
            const states = window.WorkBuddies.data.states || [];
            
            // Add state options
            states.forEach(state => {
                const sanitizedState = this.sanitizeString(state);
                const option = document.createElement('option');
                option.value = sanitizedState;
                option.textContent = sanitizedState;
                stateFilter.appendChild(option);
            });
        },
        
        /**
         * Filter data based on current filter settings
         */
        filterData: function() {
            // Track when this filter was applied
            window.WorkBuddies.data.lastFilterApplied = Date.now();
            const currentFilterTime = window.WorkBuddies.data.lastFilterApplied;
            
            // Show loading if needed
            if (window.WorkBuddies.data.filtered && window.WorkBuddies.data.filtered.length > 100) {
                this.showAppLoading(true, 'Filtering data...');
            }
            
            // Get filter values
            const nameFilter = document.getElementById('name-filter')?.value?.toLowerCase() || '';
            const stateFilter = document.getElementById('state-filter')?.value || 'all';
            
            // Use setTimeout to prevent UI freezing with large datasets
            setTimeout(() => {
                try {
                    // Only proceed if this is still the most recent filter request
                    if (currentFilterTime !== window.WorkBuddies.data.lastFilterApplied) return;
                    
                    // Make sure raw data exists
                    if (!window.WorkBuddies.data.raw) {
                        return;
                    }
                    
                    // Apply filters
                    window.WorkBuddies.data.filtered = window.WorkBuddies.data.raw.filter(buddy => {
                        // Make sure buddy has required properties
                        if (!buddy) return false;
                        
                        const nameMatch = !nameFilter || 
                            (buddy.WorkbuddyName && buddy.WorkbuddyName.toLowerCase().includes(nameFilter));
                            
                        const stateMatch = stateFilter === 'all' || 
                            (buddy.State && buddy.State === stateFilter);
                        
                        return nameMatch && stateMatch;
                    });
                    
                    // Update the active visualization
                    this.updateActiveVisualization();
                    
                    // Update total count
                    const totalCountElement = document.getElementById('total-count');
                    if (totalCountElement) {
                        totalCountElement.textContent = window.WorkBuddies.data.filtered.length;
                    }
                    
                } catch (error) {
                    console.error('Error filtering data');
                } finally {
                    // Hide loading indicator
                    this.showAppLoading(false);
                }
            }, 0);
        },
        
        /**
         * Update the active visualization based on current tab
         */
        updateActiveVisualization: function() {
            const activeTab = window.WorkBuddies.data.activeTab;
            
            switch (activeTab) {
                case 'map':
                    if (typeof window.WorkBuddies.mapViz?.updateMap === 'function') {
                        window.WorkBuddies.mapViz.updateMap();
                    } else if (typeof updateMap === 'function') {
                        updateMap();
                    }
                    break;
                case 'states':
                    if (typeof window.WorkBuddies.stateViz?.updateStateViz === 'function') {
                        window.WorkBuddies.stateViz.updateStateViz();
                    } else if (typeof updateStateViz === 'function') {
                        updateStateViz();
                    }
                    break;
                case 'network':
                    if (typeof window.WorkBuddies.networkViz?.updateNetworkViz === 'function') {
                        window.WorkBuddies.networkViz.updateNetworkViz();
                    } else if (typeof updateNetworkViz === 'function') {
                        updateNetworkViz();
                    }
                    break;
            }
        },
        
        /**
         * Switch between tabs
         * @param {string} tabId - The ID of the tab to switch to
         */
        switchTab: function(tabId) {
            // Update active tab
            window.WorkBuddies.data.activeTab = tabId;
            
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            const activeTabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
            if (activeTabBtn) {
                activeTabBtn.classList.add('active');
            }
            
            // Update tab panes
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            const activeTabPane = document.getElementById(`${tabId}-tab`);
            if (activeTabPane) {
                activeTabPane.classList.add('active');
            }
            
            // Update the visualization
            this.updateActiveVisualization();
        },
        
        /**
         * Generate a color based on a string (consistent color for the same string)
         * @param {string} str - Input string
         * @returns {string} - Hex color code
         */
        stringToColor: function(str) {
            if (!str) return 'hsl(210, 70%, 60%)';
            
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            // Generate colors in the orange to blue spectrum
            const hue = ((hash % 60) + 210) % 360; // Range from 210 (blue) to 30 (orange)
            return `hsl(${hue}, 70%, 60%)`;
        },
        
        /**
         * Export the current visualization as PNG
         */
        exportAsPNG: function() {
            const activeTab = window.WorkBuddies.data.activeTab;
            
            // Check if html2canvas is available
            if (typeof html2canvas === 'undefined') {
                alert('Export library not loaded. Please refresh the page and try again.');
                return;
            }
            
            let elementId;
            switch (activeTab) {
                case 'map':
                    elementId = 'map-container';
                    break;
                case 'states':
                    elementId = 'state-viz-container';
                    break;
                case 'network':
                    elementId = 'network-container';
                    break;
                default:
                    alert('Cannot export this visualization as PNG');
                    return;
            }
            
            const element = document.getElementById(elementId);
            if (!element) {
                alert('Visualization container not found. Please try again.');
                return;
            }
            
            // Show notification safely
            alert("Preparing export... This may take a moment.");
            
            // Capture the element with html2canvas
            html2canvas(element, {
                useCORS: true,
                allowTaint: true,
                scale: 2 // Higher quality
            }).then(canvas => {
                // Create download link
                const link = document.createElement('a');
                link.download = `workbuddies-${activeTab}-${new Date().toISOString().split('T')[0]}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(error => {
                console.error('Error exporting as PNG');
                alert('Failed to export. Please try again.');
            });
        },
        
        /**
         * Debounce function to limit how often a function is called
         * @param {Function} func - The function to debounce
         * @param {number} wait - The time to wait in milliseconds
         * @returns {Function} - The debounced function
         */
        debounce: function(func, wait) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        },
        
        /**
         * Show or hide application loading indicator
         * @param {boolean} show - Whether to show or hide the indicator
         * @param {string} message - Optional message to display
         */
        showAppLoading: function(show, message = 'Loading...') {
            // Remove any existing loading indicator
            const existingIndicator = document.getElementById('app-loading');
            if (existingIndicator) {
                document.body.removeChild(existingIndicator);
            }
            
            if (show) {
                // Create and add loading indicator
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'app-loading';
                loadingDiv.className = 'app-loading';
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'app-loading-content';
                
                const spinner = document.createElement('div');
                spinner.className = 'export-spinner';
                
                const messageP = document.createElement('p');
                messageP.textContent = this.sanitizeString(message);
                
                contentDiv.appendChild(spinner);
                contentDiv.appendChild(messageP);
                loadingDiv.appendChild(contentDiv);
                
                document.body.appendChild(loadingDiv);
                
                // Set loading state
                window.WorkBuddies.data.isLoading = true;
            } else {
                window.WorkBuddies.data.isLoading = false;
            }
        },
        
        /**
         * Show an error message to the user
         * @param {string} message - The error message to display
         */
        showErrorMessage: function(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'error-content';
            
            const heading = document.createElement('h3');
            heading.textContent = 'Error';
            
            const messageP = document.createElement('p');
            messageP.textContent = this.sanitizeString(message);
            
            const dismissBtn = document.createElement('button');
            dismissBtn.className = 'dismiss-btn';
            dismissBtn.textContent = 'Dismiss';
            
            // Add dismiss button functionality
            dismissBtn.addEventListener('click', () => {
                document.body.removeChild(errorDiv);
            });
            
            contentDiv.appendChild(heading);
            contentDiv.appendChild(messageP);
            contentDiv.appendChild(dismissBtn);
            errorDiv.appendChild(contentDiv);
            
            document.body.appendChild(errorDiv);
        },
        
        /**
         * Add a clear button to a text input filter
         * @param {HTMLElement} inputElement - The input element to add the button to
         */
        addClearButtonToFilter: function(inputElement) {
            if (!inputElement) return;
            
            // Create wrapper if it doesn't exist
            let wrapper = inputElement.parentElement;
            if (!wrapper.classList.contains('filter-input-wrapper')) {
                wrapper = document.createElement('div');
                wrapper.className = 'filter-input-wrapper';
                inputElement.parentNode.insertBefore(wrapper, inputElement);
                wrapper.appendChild(inputElement);
            }
            
            // Create clear button
            const clearButton = document.createElement('button');
            clearButton.className = 'filter-clear-btn';
            clearButton.innerHTML = '&times;';
            clearButton.title = 'Clear filter';
            clearButton.type = 'button';
            
            // Store reference to utils for event handler
            const self = this;
            
            // Add event listener
            clearButton.addEventListener('click', () => {
                inputElement.value = '';
                inputElement.focus();
                self.filterData(); // Apply the filter change
            });
            
            // Add button to wrapper
            wrapper.appendChild(clearButton);
            
            // Show/hide button based on input content
            function toggleClearButton() {
                clearButton.style.display = inputElement.value ? 'block' : 'none';
            }
            
            // Set initial state
            toggleClearButton();
            
            // Add event listeners to update button visibility
            inputElement.addEventListener('input', toggleClearButton);
            inputElement.addEventListener('change', toggleClearButton);
            inputElement.addEventListener('focus', toggleClearButton);
        }
    };
    
    // Add utils to WorkBuddies namespace
    window.WorkBuddies.utils = utils;
    
    // Initialize when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        utils.init();
    });
    
    // Backward compatibility for global functions
    window.loadData = function() { return utils.loadData(); };
    window.populateStateFilter = function() { utils.populateStateFilter(); };
    window.filterData = function() { utils.filterData(); };
    window.updateActiveVisualization = function() { utils.updateActiveVisualization(); };
    window.switchTab = function(tabId) { utils.switchTab(tabId); };
    window.stringToColor = function(str) { return utils.stringToColor(str); };
    window.exportAsPNG = function() { utils.exportAsPNG(); };
    window.showAppLoading = function(show, message) { utils.showAppLoading(show, message); };
    window.showErrorMessage = function(message) { utils.showErrorMessage(message); };
    window.addClearButtonToFilter = function(inputElement) { utils.addClearButtonToFilter(inputElement); };
    window.debounce = function(func, wait) { return utils.debounce(func, wait); };
    
})(window);