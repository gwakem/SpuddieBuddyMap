/**
 * Dark Mode functionality for WorkBuddies
 * With security enhancements and proper encapsulation
 */

(function(window) {
    'use strict';
    
    // Create namespace for the application if it doesn't exist
    if (!window.WorkBuddies) {
        window.WorkBuddies = {};
    }
    
    // Dark mode module
    const darkMode = {
        isDarkMode: false,
        STORAGE_KEY: 'workbuddies-dark-mode',
        
        /**
         * Safely get item from localStorage with validation
         * @param {string} key - Storage key
         * @returns {string|null} - Stored value or null if invalid/not found
         */
        safeGetStorageItem: function(key) {
            try {
                const value = localStorage.getItem(key);
                // Only accept expected values
                if (value === 'true' || value === 'false') {
                    return value;
                }
                return null;
            } catch (e) {
                console.error('Error accessing localStorage');
                return null;
            }
        },
        
        /**
         * Safely set item in localStorage
         * @param {string} key - Storage key
         * @param {string} value - Value to store
         * @returns {boolean} - Success or failure
         */
        safeSetStorageItem: function(key, value) {
            try {
                // Only store expected values
                if (value === 'true' || value === 'false') {
                    localStorage.setItem(key, value);
                    return true;
                }
                return false;
            } catch (e) {
                console.error('Error writing to localStorage');
                return false;
            }
        },
        
        /**
         * Initialize dark mode functionality
         */
        initDarkMode: function() {
            // Check for saved preference
            const storedPreference = this.safeGetStorageItem(this.STORAGE_KEY);
            
            // Apply preference if saved
            if (storedPreference === 'true') {
                this.enableDarkMode(false);
            } else if (storedPreference === 'false') {
                this.disableDarkMode(false);
            } else {
                // Check system preference
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    this.enableDarkMode(false);
                }
            }
            
            // Create UI controls
            this.createFixedControls();
            
            // Listen for system changes
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    if (!this.safeGetStorageItem(this.STORAGE_KEY)) {
                        if (e.matches) {
                            this.enableDarkMode(false);
                        } else {
                            this.disableDarkMode(false);
                        }
                    }
                });
            }
            
            // Store global reference for backward compatibility
            window.isDarkMode = this.isDarkMode;
        },
        
        /**
         * Create fixed controls (dark mode toggle and clear filters button)
         */
        createFixedControls: function() {
            // Remove any existing controls
            const existingControls = document.getElementById('fixed-controls');
            if (existingControls) {
                existingControls.remove();
            }
            
            // Create container
            const controlsContainer = document.createElement('div');
            controlsContainer.id = 'fixed-controls';
            controlsContainer.className = 'fixed-controls';
            controlsContainer.style.position = 'fixed';
            controlsContainer.style.top = '10px';
            controlsContainer.style.right = '10px';
            controlsContainer.style.zIndex = '1000';
            controlsContainer.style.display = 'flex';
            controlsContainer.style.gap = '10px';
            controlsContainer.style.padding = '5px';
            controlsContainer.style.borderRadius = '5px';
            controlsContainer.style.backgroundColor = 'var(--control-bg, rgba(240, 240, 240, 0.7))';
            
            // Add dark mode toggle
            const darkModeToggle = document.createElement('button');
            darkModeToggle.id = 'dark-mode-toggle';
            darkModeToggle.className = 'control-button dark-mode-toggle';
            darkModeToggle.innerHTML = this.isDarkMode ? '☀️' : '🌙';
            darkModeToggle.title = this.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
            darkModeToggle.style.background = 'transparent';
            darkModeToggle.style.border = 'none';
            darkModeToggle.style.fontSize = '1.2rem';
            darkModeToggle.style.cursor = 'pointer';
            darkModeToggle.style.padding = '5px';
            darkModeToggle.style.borderRadius = '4px';
            darkModeToggle.style.display = 'flex';
            darkModeToggle.style.alignItems = 'center';
            darkModeToggle.style.justifyContent = 'center';
            
            // Store reference to darkMode
            const self = this;
            
            darkModeToggle.addEventListener('click', function() {
                self.toggleDarkMode();
            });
            
            // Add clear filters button
            const clearFiltersBtn = document.createElement('button');
            clearFiltersBtn.id = 'clear-filters-btn';
            clearFiltersBtn.className = 'control-button clear-filters-btn';
            clearFiltersBtn.textContent = 'Clear Filters';
            clearFiltersBtn.title = 'Reset all filters';
            clearFiltersBtn.style.backgroundColor = 'var(--button-bg, #4682B4)';
            clearFiltersBtn.style.color = 'var(--button-text, white)';
            clearFiltersBtn.style.border = 'none';
            clearFiltersBtn.style.padding = '5px 10px';
            clearFiltersBtn.style.borderRadius = '4px';
            clearFiltersBtn.style.cursor = 'pointer';
            clearFiltersBtn.style.fontWeight = 'bold';
            
            clearFiltersBtn.addEventListener('click', function() {
                self.clearAllFilters();
            });
            
            // Add buttons to container
            controlsContainer.appendChild(darkModeToggle);
            controlsContainer.appendChild(clearFiltersBtn);
            
            // Add container to document
            document.body.appendChild(controlsContainer);
        },
        
        /**
         * Toggle between dark and light mode
         */
        toggleDarkMode: function() {
            if (this.isDarkMode) {
                this.disableDarkMode(true);
            } else {
                this.enableDarkMode(true);
            }
        },
        
        /**
         * Enable dark mode
         * @param {boolean} savePreference - Whether to save preference to localStorage
         */
        enableDarkMode: function(savePreference = true) {
            // Add dark mode class to body
            document.body.classList.add('dark-mode');
            this.isDarkMode = true;
            
            // Update global reference
            window.isDarkMode = true;
            
            // Update toggle button
            const toggle = document.getElementById('dark-mode-toggle');
            if (toggle) {
                toggle.innerHTML = '☀️';
                toggle.title = 'Switch to Light Mode';
            }
            
            // Save preference if requested
            if (savePreference) {
                this.safeSetStorageItem(this.STORAGE_KEY, 'true');
            }
            
            // Update map if available
            this.updateMapTheme();
            
            // Update visualizations
            this.refreshVisualizations();
        },
        
        /**
         * Disable dark mode
         * @param {boolean} savePreference - Whether to save preference to localStorage
         */
        disableDarkMode: function(savePreference = true) {
            // Remove dark mode class from body
            document.body.classList.remove('dark-mode');
            this.isDarkMode = false;
            
            // Update global reference
            window.isDarkMode = false;
            
            // Update toggle button
            const toggle = document.getElementById('dark-mode-toggle');
            if (toggle) {
                toggle.innerHTML = '🌙';
                toggle.title = 'Switch to Dark Mode';
            }
            
            // Save preference if requested
            if (savePreference) {
                this.safeSetStorageItem(this.STORAGE_KEY, 'false');
            }
            
            // Update map if available
            this.updateMapTheme();
            
            // Update visualizations
            this.refreshVisualizations();
        },
        
        /**
         * Update map theme based on dark mode
         */
        updateMapTheme: function() {
            // Try to use map from namespace first
            const map = window.WorkBuddies.mapViz?.map || window.map;
            
            if (map) {
                // Remove current tile layer
                map.eachLayer(layer => {
                    if (layer instanceof L.TileLayer) {
                        map.removeLayer(layer);
                    }
                });
                
                // Add appropriate tile layer
                if (this.isDarkMode) {
                    // Dark theme map tiles
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                        maxZoom: 19
                    }).addTo(map);
                } else {
                    // Light theme map tiles
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                        maxZoom: 19
                    }).addTo(map);
                }
                
                // Refresh markers with appropriate styling
                if (window.WorkBuddies.mapViz && typeof window.WorkBuddies.mapViz.refreshMarkers === 'function') {
                    window.WorkBuddies.mapViz.refreshMarkers();
                } else if (typeof refreshMarkers === 'function') {
                    refreshMarkers();
                }
            }
        },
        
        /**
         * Clear all filters and refresh data
         */
        clearAllFilters: function() {
            // Clear all filter inputs
            const filterInputs = document.querySelectorAll('input[type="text"], select');
            filterInputs.forEach(input => {
                if (input.id && input.id.includes('filter')) {
                    input.value = '';
                }
            });
            
            // Apply filter changes
            if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.filterData === 'function') {
                window.WorkBuddies.utils.filterData();
            } else if (typeof filterData === 'function') {
                filterData();
            }
        },
        
        /**
         * Refresh all visualizations to apply theme changes
         */
        refreshVisualizations: function() {
            // Update current visualization
            if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.updateActiveVisualization === 'function') {
                window.WorkBuddies.utils.updateActiveVisualization();
            } else if (typeof updateActiveVisualization === 'function') {
                updateActiveVisualization();
            }
        }
    };
    
    // Add dark mode module to namespace
    window.WorkBuddies.darkMode = darkMode;
    
    // Initialize dark mode on page load
    document.addEventListener('DOMContentLoaded', function() {
        darkMode.initDarkMode();
    });
    
    // Backward compatibility for global functions
    window.toggleDarkMode = function() { darkMode.toggleDarkMode(); };
    window.enableDarkMode = function(savePreference) { darkMode.enableDarkMode(savePreference); };
    window.disableDarkMode = function(savePreference) { darkMode.disableDarkMode(savePreference); };
    window.updateMapTheme = function() { darkMode.updateMapTheme(); };
    window.clearAllFilters = function() { darkMode.clearAllFilters(); };
    window.refreshVisualizations = function() { darkMode.refreshVisualizations(); };
    
})(window);