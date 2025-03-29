/**
 * Data Loader Utility for WorkBuddies Visualization
 * Includes security enhancements for data sanitization
 */

// Use IIFE to create proper encapsulation
(function(window) {
    'use strict';
    
    // Create namespace for the application if it doesn't exist
    if (!window.WorkBuddies) {
        window.WorkBuddies = {};
    }
    
    // Data loader namespace
    window.WorkBuddies.dataLoader = {
        initialized: false,
        
        /**
         * Initialize the data loader
         */
        init: function() {
            if (this.initialized) return;
            this.initialized = true;
        },
        
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
         * Load data from a CSV file
         * @param {string} filePath - Path to the CSV file
         * @returns {Promise} Promise that resolves with the loaded data
         */
        loadCSVFile: async function(filePath) {
            try {
                // Fetch the CSV file
                const response = await fetch(filePath);
                
                if (!response.ok) {
                    throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
                }
                
                const csvText = await response.text();
                
                // Parse CSV safely
                const data = this.parseCSV(csvText);
                
                // Update the global data
                this.updateGlobalData(data);
                
                return data;
            } catch (error) {
                console.error(`Error loading data: ${error.message}`);
                throw error;
            }
        },
        
        /**
         * Parse CSV content into an array of objects with sanitization
         * @param {string} csvText - The CSV content
         * @returns {Array} Array of data objects
         */
        parseCSV: function(csvText) {
            try {
                // Use PapaParse if available for safer CSV parsing
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
                    
                    // Handle empty WorkbuddyName
                    results.data.forEach((row, index) => {
                        if (!row.WorkbuddyName || row.WorkbuddyName.trim() === '') {
                            row.WorkbuddyName = `MysteriousSpuddy${1000 + index}`;
                        }
                    });
                    
                    return results.data;
                }
                
                // Basic CSV parsing as fallback with sanitization
                const lines = csvText.split(/\r?\n/);
                const headers = lines[0].split(',').map(h => this.sanitizeString(h.trim()));
                
                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = this.parseCSVLine(lines[i]);
                        
                        // Skip rows with wrong number of columns
                        if (values.length !== headers.length) {
                            continue;
                        }
                        
                        const row = {};
                        headers.forEach((header, index) => {
                            // Convert latitude and longitude to numbers
                            if (header.toLowerCase() === 'latitude' || header.toLowerCase() === 'longitude') {
                                row[header] = parseFloat(values[index]);
                                if (isNaN(row[header])) {
                                    row[header] = 0;
                                }
                            } else {
                                row[header] = this.sanitizeString(values[index] ? values[index].trim() : '');
                            }
                        });
                        
                        // Handle empty WorkbuddyName
                        if (!row.WorkbuddyName || row.WorkbuddyName.trim() === '') {
                            row.WorkbuddyName = `MysteriousSpuddy${1000 + i}`;
                        }
                        
                        data.push(row);
                    }
                }
                
                return data;
            } catch (error) {
                console.error('Error parsing CSV');
                return [];
            }
        },
        
        /**
         * Parse a CSV line correctly handling quotes
         * @param {string} line - Single line from CSV
         * @returns {string[]} Array of values
         */
        parseCSVLine: function(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            
            result.push(current);
            return result;
        },
        
        /**
         * Update the global data
         * @param {Object[]} newData - Array of new data objects
         */
        updateGlobalData: function(newData) {
            // Initialize WorkBuddies data store if it doesn't exist
            if (!window.WorkBuddies.data) {
                window.WorkBuddies.data = {};
            }
            
            // Update the data
            window.WorkBuddies.data.raw = newData;
            window.WorkBuddies.data.filtered = [...newData];
            
            // Extract unique states
            const statesSet = new Set(newData.map(item => item.State).filter(state => state));
            window.WorkBuddies.data.states = Array.from(statesSet).sort();
            
            // Update UI if needed
            this.updateUI();
            
            // For backward compatibility
            window.workBuddiesData = window.WorkBuddies.data;
        },
        
        /**
         * Update UI elements with data
         */
        updateUI: function() {
            // Update total count if element exists
            const totalCountElement = document.getElementById('total-count');
            if (totalCountElement && window.WorkBuddies.data && window.WorkBuddies.data.raw) {
                totalCountElement.textContent = window.WorkBuddies.data.raw.length || 0;
            }
            
            // Populate state filter if function exists
            if (typeof window.WorkBuddies.utils?.populateStateFilter === 'function') {
                window.WorkBuddies.utils.populateStateFilter();
            } else if (typeof populateStateFilter === 'function') {
                populateStateFilter();
            }
            
            // Update visualizations if function exists
            if (typeof window.WorkBuddies.utils?.updateActiveVisualization === 'function') {
                window.WorkBuddies.utils.updateActiveVisualization();
            } else if (typeof updateActiveVisualization === 'function') {
                updateActiveVisualization();
            }
        }
    };
    
    /**
     * Show toast message (utility function)
     * @param {string} message - Message to display
     * @param {string} type - Message type (success, error, info, warning)
     */
    function showToast(message, type = 'success') {
        // Sanitize message
        const sanitizedMessage = window.WorkBuddies.dataLoader.sanitizeString(message);
        
        // Check if the toast container exists
        let container = document.getElementById('toast-container');
        
        // Create container if it doesn't exist
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
            
            // Add styles if they don't exist
            if (!document.getElementById('toast-styles')) {
                const style = document.createElement('style');
                style.id = 'toast-styles';
                style.textContent = `
                    .toast-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 9999;
                    }
                    .toast {
                        padding: 12px 20px;
                        margin-bottom: 10px;
                        border-radius: 4px;
                        color: white;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                        display: flex;
                        align-items: center;
                        animation: slideIn 0.3s ease forwards;
                        max-width: 300px;
                        word-break: break-word;
                    }
                    .toast.success { background-color: #4CAF50; }
                    .toast.error { background-color: #F44336; }
                    .toast.info { background-color: #2196F3; }
                    .toast.warning { background-color: #FF9800; }
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes fadeOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Create toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Use textContent instead of innerHTML for security
        toast.textContent = sanitizedMessage;
        
        // Add to container
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
    
    // Make showToast available in the namespace
    window.WorkBuddies.showToast = showToast;
    
    // Initialize data loader when document is ready
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            if (!window.WorkBuddies.dataLoader.initialized) {
                window.WorkBuddies.dataLoader.init();
            }
        }, 500);
    });
    
    // Expose for backward compatibility
    window.showToast = showToast;
    window.dataLoader = window.WorkBuddies.dataLoader;
    
})(window);