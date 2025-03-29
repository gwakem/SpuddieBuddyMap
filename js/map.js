/**
 * Map visualization for WorkBuddies
 * With security enhancements and proper encapsulation
 */

(function(window) {
    'use strict';
    
    // Create namespace for the application if it doesn't exist
    if (!window.WorkBuddies) {
        window.WorkBuddies = {};
    }
    
    // Map visualization module
    const mapViz = {
        map: null,
        markers: [],
        mapLegend: null,
        
        /**
         * Sanitize a string to prevent XSS
         * @param {string} str - String to sanitize
         * @returns {string} - Sanitized string
         */
        sanitizeString: function(str) {
            if (!str) return '';
            
            // Use WorkBuddies.utils.sanitizeString if available
            if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.sanitizeString === 'function') {
                return window.WorkBuddies.utils.sanitizeString(str);
            }
            
            // Use DOMPurify if available
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
         * Get color for buddy (safely)
         * @param {string} name - Buddy name
         * @returns {string} - Color string
         */
        getBuddyColor: function(name) {
            // Use WorkBuddies.utils.stringToColor if available
            if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.stringToColor === 'function') {
                return window.WorkBuddies.utils.stringToColor(name);
            }
            
            // Fallback to global function
            if (typeof stringToColor === 'function') {
                return stringToColor(name);
            }
            
            // Default color if function not available
            return 'hsl(210, 70%, 60%)';
        },
        
        /**
         * Initialize the map
         */
        initMap: function() {
            // Create map instance if it doesn't exist
            if (!this.map) {
                this.map = L.map('map-container').setView([20, 0], 2);
                
                // Add multiple tile layer options
                const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 18
                });
                
                const cartoDBLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 19
                });
                
                // Add base maps to the map
                const baseMaps = {
                    "OpenStreetMap": osmLayer,
                    "CartoDB Light": cartoDBLayer
                };
                
                // Set default layer
                osmLayer.addTo(this.map);
                
                // Add layer control
                L.control.layers(baseMaps).addTo(this.map);
                
                // Add scale control
                L.control.scale().addTo(this.map);
                
                // Create map legend
                this.createMapLegend();
                
                // Make global reference for backward compatibility
                window.map = this.map;
            }
            
            // Initial update of the map
            this.updateMap();
            
            // Make sure the map refreshes when container is resized
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        },
        
        /**
         * Create a popup content element safely
         * @param {Object} buddy - Buddy data object
         * @returns {HTMLElement} - Popup content element
         */
        createPopupContent: function(buddy) {
            // Create main container
            const container = document.createElement('div');
            container.className = 'buddy-popup';
            
            // Name div
            const nameDiv = document.createElement('div');
            nameDiv.className = 'name';
            nameDiv.textContent = this.sanitizeString(buddy.WorkbuddyName);
            container.appendChild(nameDiv);
            
            // Location div
            const locationDiv = document.createElement('div');
            locationDiv.className = 'location';
            
            const city = this.sanitizeString(buddy.City) || "Unknown City";
            const state = this.sanitizeString(buddy.State) || "Unknown State";
            const country = this.sanitizeString(buddy.Country) || "Unknown Country";
            
            locationDiv.textContent = `${city}, ${state}, ${country}`;
            container.appendChild(locationDiv);
            
            // Actions div
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';
            
            // Zoom button (no inline JavaScript)
            const zoomBtn = document.createElement('button');
            zoomBtn.className = 'zoom-to-btn';
            zoomBtn.textContent = 'Zoom To';
            
            // Store reference to mapViz for the event handler
            const self = this;
            
            // Add event listener instead of inline onclick
            zoomBtn.addEventListener('click', function() {
                self.zoomToSpuddy(buddy.WorkbuddyName);
            });
            
            actionsDiv.appendChild(zoomBtn);
            container.appendChild(actionsDiv);
            
            return container;
        },
        
        /**
         * Update the map with current data
         */
        updateMap: function() {
            const map = this.map;
            if (!map) return;
            
            // Clear existing markers
            this.markers.forEach(marker => {
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            });
            this.markers = [];
            
            // Get filtered data
            const data = window.WorkBuddies.data ? window.WorkBuddies.data.filtered : 
                          (window.workBuddiesData ? window.workBuddiesData.filtered : []);
            
            // Update the "No Data" message if needed
            const mapContainer = document.getElementById('map-container');
            let noDataMessage = document.getElementById('map-no-data');
            
            if (data.length === 0) {
                // Create or show the "No Data" message
                if (!noDataMessage) {
                    noDataMessage = document.createElement('div');
                    noDataMessage.id = 'map-no-data';
                    noDataMessage.className = 'no-data-message';
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'no-data-content';
                    
                    const heading = document.createElement('h3');
                    heading.textContent = 'No Spuddies Found';
                    
                    const message = document.createElement('p');
                    message.textContent = 'Try adjusting your filters to see more data.';
                    
                    const resetBtn = document.createElement('button');
                    resetBtn.id = 'reset-filters';
                    resetBtn.className = 'reset-btn';
                    resetBtn.textContent = 'Reset Filters';
                    
                    // Add click handler
                    resetBtn.addEventListener('click', this.resetFilters.bind(this));
                    
                    contentDiv.appendChild(heading);
                    contentDiv.appendChild(message);
                    contentDiv.appendChild(resetBtn);
                    noDataMessage.appendChild(contentDiv);
                    
                    mapContainer.appendChild(noDataMessage);
                } else {
                    noDataMessage.style.display = 'flex';
                }
                return;
            } else if (noDataMessage) {
                // Hide the "No Data" message if it exists
                noDataMessage.style.display = 'none';
            }
            
            // Add markers for each buddy
            data.forEach(buddy => {
                // Skip if latitude or longitude is missing or invalid
                if (
                    !buddy.latitude || 
                    !buddy.longitude || 
                    isNaN(buddy.latitude) || 
                    isNaN(buddy.longitude) ||
                    (buddy.latitude === 0 && buddy.longitude === 0)
                ) return;
                
                try {
                    // Generate a vibrant color for the buddy
                    const potatoColor = this.getBuddyColor(buddy.WorkbuddyName);
                    
                    // Create stylish potato marker icon (sanitized)
                    const potatoIcon = L.divIcon({
                        className: 'potato-marker-wrapper',
                        html: `
                            <div class="potato-marker">
                                <div class="potato-emoji-container" style="background: radial-gradient(circle, ${potatoColor} 60%, rgba(0,0,0,0.2) 100%);">
                                    <div class="potato-emoji">🥔</div>
                                </div>
                                <div class="potato-label" style="color: var(--light-text); background-color: rgba(255, 255, 255, 0.85); border: 2px solid ${potatoColor}; text-shadow: 0px 0px 2px #fff;">${this.sanitizeString(buddy.WorkbuddyName)}</div>
                            </div>
                        `,
                        iconSize: [40, 60],
                        iconAnchor: [20, 40],
                        popupAnchor: [0, -40]
                    });
                    
                    // Create marker with custom icon
                    const marker = L.marker([buddy.latitude, buddy.longitude], { icon: potatoIcon });
                    
                    // Create popup content
                    const popupContent = this.createPopupContent(buddy);
                    
                    // Bind popup with content
                    marker.bindPopup(popupContent);
                    
                    // Add marker directly to map
                    marker.addTo(map);
                    this.markers.push(marker);
                } catch (e) {
                    console.error('Error adding marker');
                }
            });
            
            // Adjust view to fit all markers if we have any
            if (this.markers.length > 0) {
                try {
                    const group = L.featureGroup(this.markers);
                    const bounds = group.getBounds();
                    map.fitBounds(bounds, { padding: [50, 50] });
                } catch (e) {
                    console.error('Error fitting bounds');
                }
            }
            
            // Update legend
            this.updateMapLegend();
        },
        
        /**
         * Reset all filters and update the map
         */
        resetFilters: function() {
            const nameFilter = document.getElementById('name-filter');
            const stateFilter = document.getElementById('state-filter');
            
            if (nameFilter) nameFilter.value = '';
            if (stateFilter) stateFilter.value = 'all';
            
            // Use our own filterData if available
            if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.filterData === 'function') {
                window.WorkBuddies.utils.filterData();
            } else if (typeof filterData === 'function') {
                filterData();
            }
        },
        
        /**
         * Zoom to a specific buddy's location
         * @param {string} buddyName - The name of the buddy to zoom to
         */
        zoomToSpuddy: function(buddyName) {
            // Get data from namespace or global variable
            const data = window.WorkBuddies.data ? window.WorkBuddies.data.filtered : 
                         (window.workBuddiesData ? window.workBuddiesData.filtered : []);
            
            // Find buddy
            const buddy = data.find(b => b.WorkbuddyName === buddyName);
            
            if (buddy && buddy.latitude && buddy.longitude) {
                // Use flyTo for smoother animation
                this.map.flyTo([buddy.latitude, buddy.longitude], 12, {
                    duration: 1.5,
                    easeLinearity: 0.5
                });
            }
        },
        
        /**
         * Create a custom legend for the map
         */
        createMapLegend: function() {
            // Create a legend control
            this.mapLegend = L.control({position: 'bottomright'});
            
            // Store reference to mapViz
            const self = this;
            
            this.mapLegend.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'map-legend');
                div.innerHTML = `
                    <h4>WorkBuddies Map</h4>
                    <div class="legend-item">
                        <div class="legend-marker potato-icon">
                            <span class="legend-emoji">🥔</span>
                        </div>
                        <span>Spuddy Location</span>
                    </div>
                    <div class="legend-count">
                        <span id="visible-count">0</span> Spuddies visible
                    </div>
                `;
                return div;
            };
            
            this.mapLegend.addTo(this.map);
        },
        
        /**
         * Update the map legend with current information
         */
        updateMapLegend: function() {
            const visibleCountElement = document.getElementById('visible-count');
            if (visibleCountElement) {
                visibleCountElement.textContent = this.markers.length;
            }
        },
        
        /**
         * Refresh markers with current styling
         */
        refreshMarkers: function() {
            // Simply reupdate the map
            this.updateMap();
        },
        
        /**
         * Export the map as PNG
         */
        exportMapAsPNG: function() {
            // Use html2canvas to capture the map
            if (!this.map) return;
            
            // Check if html2canvas is available
            if (typeof html2canvas === 'undefined') {
                alert('Export library not loaded. Please refresh the page and try again.');
                return;
            }
            
            // Create a notification that we're preparing the export (safely)
            alert('Preparing map export... This may take a moment.');
            
            // Give the map a moment to update
            setTimeout(() => {
                const mapContainer = document.getElementById('map-container');
                if (!mapContainer) return;
                
                // Add a temporary class to improve export quality
                mapContainer.classList.add('exporting');
                
                html2canvas(mapContainer, {
                    useCORS: true,
                    allowTaint: true,
                    scale: 2 // Higher quality
                }).then(canvas => {
                    // Remove the export class
                    mapContainer.classList.remove('exporting');
                    
                    // Create download link
                    const link = document.createElement('a');
                    link.download = `workbuddies-map-${new Date().toISOString().split('T')[0]}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }).catch(error => {
                    console.error('Error exporting map');
                    alert('Failed to export map. Please try again.');
                    mapContainer.classList.remove('exporting');
                });
            }, 300);
        }
    };
    
    // Add map visualization to the namespace
    window.WorkBuddies.mapViz = mapViz;
    
    // Backward compatibility for global functions
    window.initMap = function() { mapViz.initMap(); };
    window.updateMap = function() { mapViz.updateMap(); };
    window.resetFilters = function() { mapViz.resetFilters(); };
    window.zoomToSpuddy = function(buddyName) { mapViz.zoomToSpuddy(buddyName); };
    window.createMapLegend = function() { mapViz.createMapLegend(); };
    window.updateMapLegend = function() { mapViz.updateMapLegend(); };
    window.refreshMarkers = function() { mapViz.refreshMarkers(); };
    window.exportMapAsPNG = function() { mapViz.exportMapAsPNG(); };
    
})(window);