/**
 * Main application script for WorkBuddies Visualization
 * With security enhancements and proper encapsulation
 */

(function(window) {
    'use strict';
    
    // Create namespace for the application if it doesn't exist
    if (!window.WorkBuddies) {
        window.WorkBuddies = {};
    }
    
    // Application module
    const app = {
        /**
         * Initialize the application
         */
        initializeApp: async function() {
            try {
                // Define application version and environment
                window.WorkBuddies.version = '1.0.0';
                window.WorkBuddies.environment = 'production';
                
                // Load data
                let data;
                if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.loadData === 'function') {
                    data = await window.WorkBuddies.utils.loadData();
                } else if (typeof loadData === 'function') {
                    data = await loadData();
                } else {
                    throw new Error("Data loading function not found");
                }
                
                if (!data || data.length === 0) {
                    throw new Error("No data loaded");
                }
                
                // Initialize visualizations
                this.initVisualizations();
                
                // Set up event listeners
                this.setupEventListeners();
                
                // Start with 'map' tab active
                if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.switchTab === 'function') {
                    window.WorkBuddies.utils.switchTab('map');
                } else if (typeof switchTab === 'function') {
                    switchTab('map');
                }
            } catch (error) {
                this.handleError('Failed to initialize the application. Please refresh the page and try again.');
            }
        },
        
        /**
         * Initialize all visualizations
         */
        initVisualizations: function() {
            // Initialize map
            if (window.WorkBuddies.mapViz && typeof window.WorkBuddies.mapViz.initMap === 'function') {
                window.WorkBuddies.mapViz.initMap();
            } else if (typeof initMap === 'function') {
                initMap();
            }
            
            // Initialize state visualization
            try {
                if (window.WorkBuddies.stateViz && typeof window.WorkBuddies.stateViz.initStateViz === 'function') {
                    window.WorkBuddies.stateViz.initStateViz();
                } else if (typeof initStateViz === 'function') {
                    initStateViz();
                }
            } catch (error) {
                console.error("State visualization init error");
            }
        },
        
        /**
         * Set up event listeners for UI elements
         */
        setupEventListeners: function() {
            // Set up tab switching
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (event) => {
                    const tabId = event.currentTarget.getAttribute('data-tab');
                    
                    // Clean up resources for current tab
                    this.cleanupCurrentTab();
                    
                    // Switch to new tab
                    if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.switchTab === 'function') {
                        window.WorkBuddies.utils.switchTab(tabId);
                    } else if (typeof switchTab === 'function') {
                        switchTab(tabId);
                    }
                });
            });
            
            // Set up filters
            const nameFilter = document.getElementById('name-filter');
            const stateFilter = document.getElementById('state-filter');
            
            if (nameFilter) {
                nameFilter.addEventListener('input', () => {
                    if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.filterData === 'function') {
                        window.WorkBuddies.utils.filterData();
                    } else if (typeof filterData === 'function') {
                        filterData();
                    }
                });
                
                // Add clear button to name filter
                if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.addClearButtonToFilter === 'function') {
                    window.WorkBuddies.utils.addClearButtonToFilter(nameFilter);
                } else if (typeof addClearButtonToFilter === 'function') {
                    addClearButtonToFilter(nameFilter);
                }
            }
            
            if (stateFilter) {
                stateFilter.addEventListener('change', () => {
                    if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.filterData === 'function') {
                        window.WorkBuddies.utils.filterData();
                    } else if (typeof filterData === 'function') {
                        filterData();
                    }
                });
            }
            
            // Set up export buttons
            const pngBtn = document.getElementById('export-png');
            
            if (pngBtn) {
                pngBtn.addEventListener('click', () => {
                    if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.exportAsPNG === 'function') {
                        window.WorkBuddies.utils.exportAsPNG();
                    } else if (typeof exportAsPNG === 'function') {
                        exportAsPNG();
                    }
                });
            }
            
            // Handle window resize
            this.setupResizeHandler();
        },
        
        /**
         * Clean up resources for the current tab
         */
        cleanupCurrentTab: function() {
            try {
                const activeTab = window.WorkBuddies.data ? window.WorkBuddies.data.activeTab : 
                                 (window.workBuddiesData ? window.workBuddiesData.activeTab : 'map');
                
                switch (activeTab) {
                    case 'states':
                        if (window.WorkBuddies.stateViz && typeof window.WorkBuddies.stateViz.cleanupStateViz === 'function') {
                            window.WorkBuddies.stateViz.cleanupStateViz();
                        } else if (typeof cleanupStateViz === 'function') {
                            cleanupStateViz();
                        }
                        break;
                }
            } catch (e) {
                console.error('Error during cleanup');
            }
        },
        
        /**
         * Handle window resize events
         */
        setupResizeHandler: function() {
            let resizeTimer;
            
            window.addEventListener('resize', () => {
                // Debounce the resize event
                if (resizeTimer) {
                    clearTimeout(resizeTimer);
                }
                
                resizeTimer = setTimeout(() => {
                    // Update active visualization on resize
                    try {
                        if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.updateActiveVisualization === 'function') {
                            window.WorkBuddies.utils.updateActiveVisualization();
                        } else if (typeof updateActiveVisualization === 'function') {
                            updateActiveVisualization();
                        }
                        
                        // Special handling for map
                        const activeTab = window.WorkBuddies.data ? window.WorkBuddies.data.activeTab : 
                                         (window.workBuddiesData ? window.workBuddiesData.activeTab : 'map');
                        
                        if (activeTab === 'map') {
                            const map = window.WorkBuddies.mapViz?.map || window.map;
                            if (map) {
                                map.invalidateSize();
                            }
                        }
                    } catch (e) {
                        console.error('Error handling resize');
                    }
                }, 250);
            });
        },
        
        /**
         * Handle application errors
         * @param {string} message - Error message to display
         */
        handleError: function(message) {
            // In production, show user-friendly error without details
            const userMessage = window.WorkBuddies.environment === 'production' ? 
                'An error occurred. Please try again later.' : message;
            
            // Show error message
            if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.showErrorMessage === 'function') {
                window.WorkBuddies.utils.showErrorMessage(userMessage);
            } else if (typeof showErrorMessage === 'function') {
                showErrorMessage(userMessage);
            } else {
                alert(userMessage);
            }
        },
        
        /**
         * Network visualization placeholder
         */
        updateNetworkViz: function() {
            const container = document.getElementById('network-container');
            if (!container) return;
            
            // Clear existing content
            container.innerHTML = '';
            
            // Create elements safely
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';
            wrapper.style.height = '100%';
            
            const heading = document.createElement('h2');
            heading.textContent = 'Spuddy Network Visualization';
            
            const description = document.createElement('p');
            description.style.marginTop = '20px';
            description.style.textAlign = 'center';
            description.style.maxWidth = '600px';
            description.textContent = 'This visualization will show connections between Spuddies. Coming soon!';
            
            wrapper.appendChild(heading);
            wrapper.appendChild(description);
            container.appendChild(wrapper);
        }
    };
    
    // Add app module to namespace
    window.WorkBuddies.app = app;
    
    // Initialize the application when the DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        app.initializeApp();
    });
    
    // Backward compatibility for global functions
    window.initializeApp = function() { return app.initializeApp(); };
    window.cleanupCurrentTab = function() { app.cleanupCurrentTab(); };
    window.updateNetworkViz = function() { app.updateNetworkViz(); };
    
})(window);