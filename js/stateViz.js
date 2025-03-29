/**
 * State Distribution visualization for WorkBuddies
 * With security enhancements and proper encapsulation
 */

(function(window) {
    'use strict';
    
    // Create namespace for the application if it doesn't exist
    if (!window.WorkBuddies) {
        window.WorkBuddies = {};
    }
    
    // State visualization module
    const stateViz = {
        chart: null,
        isInitialized: false,
        
        /**
         * Check if D3 is available
         * @returns {boolean} - Whether D3 is available
         */
        isD3Available: function() {
            return typeof d3 !== 'undefined';
        },
        
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
         * Initialize the State Distribution visualization
         */
        initStateViz: function() {
            try {
                // Check if D3 is available
                if (!this.isD3Available()) {
                    console.warn("D3 library not available. State visualization cannot be initialized.");
                    this.showD3NotAvailableMessage();
                    return;
                }
                
                // Clear any existing content
                const container = document.getElementById('state-viz-container');
                if (container) {
                    container.innerHTML = '';
                }
                
                // Create SVG container immediately with fixed dimensions to prevent layout shifts
                const svgContainer = d3.select('#state-viz-container')
                    .append('svg')
                    .attr('width', '100%')
                    .attr('height', '500px')
                    .attr('class', 'state-viz-svg');
                    
                // Mark as initialized
                this.isInitialized = true;
                
                // Store global reference for backward compatibility
                window.isStateVizInitialized = true;
                
                // Update with data
                this.updateStateViz();
            } catch (error) {
                console.error("Error initializing state visualization:", error);
                this.showD3NotAvailableMessage();
            }
        },
        
        /**
         * Show a message when D3 is not available
         */
        showD3NotAvailableMessage: function() {
            const container = document.getElementById('state-viz-container');
            if (!container) return;
            
            // Clear container
            container.innerHTML = '';
            
            // Create message elements
            const messageDiv = document.createElement('div');
            messageDiv.style.display = 'flex';
            messageDiv.style.flexDirection = 'column';
            messageDiv.style.alignItems = 'center';
            messageDiv.style.justifyContent = 'center';
            messageDiv.style.height = '100%';
            messageDiv.style.padding = '20px';
            
            const messageHeading = document.createElement('h3');
            messageHeading.textContent = 'Visualization Library Not Available';
            
            const messageText = document.createElement('p');
            messageText.textContent = 'The D3 visualization library could not be loaded. Please refresh the page or check your internet connection.';
            
            const reloadButton = document.createElement('button');
            reloadButton.textContent = 'Reload Page';
            reloadButton.style.padding = '8px 16px';
            reloadButton.style.marginTop = '15px';
            reloadButton.style.cursor = 'pointer';
            reloadButton.addEventListener('click', function() {
                window.location.reload();
            });
            
            // Append elements
            messageDiv.appendChild(messageHeading);
            messageDiv.appendChild(messageText);
            messageDiv.appendChild(reloadButton);
            container.appendChild(messageDiv);
        },
        
        /**
         * Update the State Distribution visualization with current data
         */
        updateStateViz: function() {
            try {
                // Check if D3 is available
                if (!this.isD3Available()) {
                    console.warn("D3 library not available. State visualization cannot be updated.");
                    this.showD3NotAvailableMessage();
                    return;
                }
                
                const container = document.getElementById('state-viz-container');
                if (!container) {
                    return;
                }
                
                // Get SVG element
                const svg = d3.select('.state-viz-svg');
                if (svg.empty()) {
                    // If SVG doesn't exist, try to initialize again
                    this.initStateViz();
                    return;
                }
                
                // Clear previous content but keep the SVG element
                svg.selectAll('*').remove();
                
                // Get filtered data
                const data = window.WorkBuddies.data ? window.WorkBuddies.data.filtered : 
                             (window.workBuddiesData ? window.workBuddiesData.filtered : []);
                
                if (!data || data.length === 0) {
                    svg.append('text')
                        .attr('x', '50%')
                        .attr('y', '50%')
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .text('No data to display');
                    return;
                }
                
                // Set up dimensions
                const containerWidth = container.clientWidth;
                const containerHeight = 500; // Fixed height
                
                const margin = { top: 30, right: 30, bottom: 90, left: 60 };
                const width = containerWidth - margin.left - margin.right;
                const height = containerHeight - margin.top - margin.bottom;
                
                // Create chart group with proper transform
                const chartGroup = svg.append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);
                
                // Count buddies by state
                const stateCounts = {};
                data.forEach(buddy => {
                    if (buddy && buddy.State) {
                        const state = this.sanitizeString(buddy.State);
                        stateCounts[state] = (stateCounts[state] || 0) + 1;
                    }
                });
                
                // Convert to array for D3
                const stateData = Object.entries(stateCounts).map(([state, count]) => ({
                    state: this.sanitizeString(state),
                    count
                })).sort((a, b) => b.count - a.count);
                
                // Add title
                chartGroup.append('text')
                    .attr('x', width / 2)
                    .attr('y', -10)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '16px')
                    .style('font-weight', 'bold')
                    .text('Spuddy Distribution by State');
                
                // X axis
                const x = d3.scaleBand()
                    .range([0, width])
                    .domain(stateData.map(d => d.state))
                    .padding(0.2);
                
                chartGroup.append('g')
                    .attr('transform', `translate(0,${height})`)
                    .call(d3.axisBottom(x))
                    .selectAll('text')
                    .attr('transform', 'translate(-10,0)rotate(-45)')
                    .style('text-anchor', 'end');
                
                // Y axis
                const maxCount = Math.max(...stateData.map(d => d.count));
                const y = d3.scaleLinear()
                    .domain([0, maxCount * 1.1]) // Add some padding at the top
                    .range([height, 0]);
                
                chartGroup.append('g')
                    .call(d3.axisLeft(y));
                
                // Add Y axis label
                chartGroup.append('text')
                    .attr('transform', 'rotate(-90)')
                    .attr('y', -40)
                    .attr('x', -height / 2)
                    .attr('text-anchor', 'middle')
                    .text('Number of Spuddies');
                
                // Store reference to stateViz for event handlers
                const self = this;
                
                // Add bars with animation
                chartGroup.selectAll('.bar')
                    .data(stateData)
                    .enter()
                    .append('rect')
                    .attr('class', 'bar')
                    .attr('x', d => x(d.state))
                    .attr('y', height) // Start from the bottom for animation
                    .attr('width', x.bandwidth())
                    .attr('height', 0) // Start with height 0 for animation
                    .attr('fill', d => {
                        // Gradient from orange (high) to blue (low)
                        const ratio = d.count / maxCount;
                        return d3.interpolateRgb('#4682B4', '#FF8C00')(ratio);
                    })
                    .on('mouseover', function(event, d) {
                        d3.select(this).attr('fill', '#FFD700'); // Highlight on hover
                        
                        // Add tooltip
                        const tooltip = chartGroup.append('g')
                            .attr('class', 'tooltip')
                            .attr('transform', `translate(${x(d.state) + x.bandwidth() / 2},${y(d.count) - 10})`);
                        
                        tooltip.append('text')
                            .attr('text-anchor', 'middle')
                            .text(`${d.count} Spuddies`)
                            .style('font-size', '12px')
                            .style('font-weight', 'bold');
                    })
                    .on('mouseout', function(event, d) {
                        // Revert color on mouseout
                        const ratio = d.count / maxCount;
                        d3.select(this).attr('fill', d3.interpolateRgb('#4682B4', '#FF8C00')(ratio));
                        
                        // Remove tooltip
                        chartGroup.select('.tooltip').remove();
                    })
                    .on('click', function(event, d) {
                        // Filter to show only buddies from this state
                        const stateFilter = document.getElementById('state-filter');
                        if (stateFilter) stateFilter.value = d.state;
                        
                        // Call filterData function
                        if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.filterData === 'function') {
                            window.WorkBuddies.utils.filterData();
                        } else if (typeof filterData === 'function') {
                            filterData();
                        }
                        
                        // Switch to map view
                        if (window.WorkBuddies.utils && typeof window.WorkBuddies.utils.switchTab === 'function') {
                            window.WorkBuddies.utils.switchTab('map');
                        } else if (typeof switchTab === 'function') {
                            switchTab('map');
                        }
                        
                        // Find buddies in this state
                        const data = window.WorkBuddies.data ? window.WorkBuddies.data.filtered : 
                                     (window.workBuddiesData ? window.workBuddiesData.filtered : []);
                                    
                        const stateBuddies = data.filter(buddy => buddy.State === d.state);
                        
                        // Focus map on these buddies
                        if (stateBuddies.length > 0) {
                            const map = window.WorkBuddies.mapViz?.map || window.map;
                            
                            if (map) {
                                // Create bounds to fit all buddies in this state
                                const bounds = L.latLngBounds();
                                stateBuddies.forEach(buddy => {
                                    // Handle both camelCase and PascalCase property names
                                    const lat = buddy.latitude || buddy.Latitude;
                                    const lng = buddy.longitude || buddy.Longitude;
                                    if (lat && lng) {
                                        bounds.extend([lat, lng]);
                                    }
                                });
                                
                                // If valid bounds, fit map to these bounds
                                if (bounds.isValid()) {
                                    map.fitBounds(bounds, { padding: [50, 50] });
                                }
                            }
                        }
                    })
                    // Animate bars growing upward
                    .transition()
                    .duration(800)
                    .attr('y', d => y(d.count))
                    .attr('height', d => height - y(d.count));
                
                // Store chart reference
                this.chart = chartGroup;
                
                // Store global reference for backward compatibility
                window.stateChart = chartGroup;
                
            } catch (error) {
                console.error("Error in state visualization:", error);
                this.showD3NotAvailableMessage();
            }
        },
        
        /**
         * Clean up resources when switching tabs
         */
        cleanupStateViz: function() {
            // No specific cleanup needed for D3 charts
        },
        
        /**
         * Export the state visualization as PNG
         */
        exportStateVizAsPNG: function() {
            // Get container
            const container = document.getElementById('state-viz-container');
            if (!container) {
                alert("Unable to export State Visualization. Container not found.");
                return;
            }
            
            // Check if html2canvas is available
            if (typeof html2canvas === 'undefined') {
                alert('Export library not loaded. Please refresh the page and try again.');
                return;
            }
            
            // Create a notification that we're preparing the export
            alert('Preparing state visualization export... This may take a moment.');
            
            // Give the visualization a moment to update
            setTimeout(() => {
                container.classList.add('exporting');
                
                html2canvas(container, {
                    backgroundColor: null,
                    scale: 2
                }).then(canvas => {
                    // Remove the export class
                    container.classList.remove('exporting');
                    
                    // Create download link
                    const link = document.createElement('a');
                    link.download = `workbuddies-states-${new Date().toISOString().split('T')[0]}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }).catch(error => {
                    console.error('Error exporting state visualization');
                    alert('Failed to export state visualization. Please try again.');
                    container.classList.remove('exporting');
                });
            }, 300);
        }
    };
    
    // Add state visualization to the namespace
    window.WorkBuddies.stateViz = stateViz;
    
    // Backward compatibility for global functions
    window.initStateViz = function() { stateViz.initStateViz(); };
    window.updateStateViz = function() { stateViz.updateStateViz(); };
    window.cleanupStateViz = function() { stateViz.cleanupStateViz(); };
    window.exportStateVizAsPNG = function() { stateViz.exportStateVizAsPNG(); };
    
})(window);