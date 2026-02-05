// js/map.js

let map;
let markers = [];
let pathPolyline = null;
let roverMarker = null;

export function initMap() {
    // Default to a central location (can use geolocation later)
    map = L.map('map').setView([12.9716, 77.5946], 13); // Bangalore coordinates as placeholder

    // Base Layers
    // Base Layers
    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 21,
        attribution: '© OpenStreetMap'
    });

    // Google Satellite (Hybrid) - Better resolution than Esri in many areas
    const googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps'
    });

    // Default to Google Satellite for high res
    googleSat.addTo(map);

    L.control.layers({
        "Google Satellite": googleSat,
        "Street Map": osm
    }).addTo(map);

    return map;
}

export function enableDrawing(onPointAdded) {
    map.on('click', function (e) {
        addWaypoint(e.latlng, onPointAdded);
    });
}

function addWaypoint(latlng, callback) {
    // Check for Loop Closure (Clicking on Start Point)
    // We need to check if the click location is very close to the start point
    // OR if the user clicked the marker itself (handled via marker event below)

    // Create Marker
    const marker = L.marker(latlng, {
        draggable: true,
        title: `WP ${markers.length + 1}`
    }).addTo(map);

    markers.push({
        lat: latlng.lat,
        lng: latlng.lng,
        marker: marker
    });

    updatePolyline();
    if (callback) callback(getWaypoints());

    // Loop Closure & Connection Events
    marker.on('click', () => {
        const lastMarker = markers[markers.length - 1];

        // Prevent connecting to the immediate last point (clicking itself)
        // ensure we have at least 2 points to make a line
        if (markers.length > 1 && lastMarker.marker !== marker) {

            const targetPos = marker.getLatLng();

            // Check if we are already connected to this point (prevent double clicks/duplicates at end)
            // (The lastMarker check above mostly handles this, but coordinate check is safer)
            if (lastMarker.lat !== targetPos.lat || lastMarker.lng !== targetPos.lng) {
                console.log("Connecting loop to waypoint");
                addWaypoint(targetPos, callback);
            }
        }
    });

    marker.on('dragend', function (event) {
        const position = marker.getLatLng();
        const index = markers.findIndex(m => m.marker === marker);
        if (index !== -1) {
            markers[index].lat = position.lat;
            markers[index].lng = position.lng;
            updatePolyline();
            if (callback) callback(getWaypoints());
        }
    });
}

function updatePolyline() {
    if (pathPolyline) {
        map.removeLayer(pathPolyline);
    }

    const latlngs = markers.map(m => [m.lat, m.lng]);
    pathPolyline = L.polyline(latlngs, {
        color: '#3b82f6', // Accent blue
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10' // Dashed line for "planned" path
    }).addTo(map);

    // Add Directional Arrows
    if (window.arrowLayer) {
        map.removeLayer(window.arrowLayer);
    }

    if (latlngs.length > 1) {
        window.arrowLayer = L.polylineDecorator(pathPolyline, {
            patterns: [
                {
                    offset: '10%',
                    repeat: '20%',
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 15,
                        polygon: true,
                        pathOptions: { stroke: true, color: '#3b82f6', fillOpacity: 1 }
                    })
                }
            ]
        }).addTo(map);
    }
}

export function clearMap() {
    markers.forEach(m => map.removeLayer(m.marker));
    markers = [];
    if (pathPolyline) map.removeLayer(pathPolyline);
    if (window.arrowLayer) {
        map.removeLayer(window.arrowLayer);
        window.arrowLayer = null;
    }
    pathPolyline = null;
}

export function getWaypoints() {
    return markers.map(m => ({ lat: m.lat, lng: m.lng }));
}

export function updatePath(newWaypoints) {
    // Clear existing visualization but keep logic clean
    // For optimization, we might strictly redraw based on new order

    // First, remove old line
    if (pathPolyline) map.removeLayer(pathPolyline);

    // Re-order internal markers array if needed or just redraw line?
    // Let's just redraw the line to show the *optimized path*
    // Note: This doesn't reorder the physical markers in the UI array, just the visual line.

    const latlngs = newWaypoints.map(wp => [wp.lat, wp.lng]);

    pathPolyline = L.polyline(latlngs, {
        color: '#10b981', // Green for Optimized
        weight: 5,
        opacity: 1
    }).addTo(map);

    // Add Directional Arrows for Optimized Path
    if (window.arrowLayer) {
        map.removeLayer(window.arrowLayer);
    }

    if (latlngs.length > 1) {
        window.arrowLayer = L.polylineDecorator(pathPolyline, {
            patterns: [
                {
                    offset: '25',
                    repeat: '50',
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 15,
                        polygon: true,
                        pathOptions: { stroke: true, color: '#10b981', fillOpacity: 1 }
                    })
                }
            ]
        }).addTo(map);
    }
}

export function updateRoverPosition(lat, lng, heading) {
    if (!roverMarker) {
        // Create Rover Icon
        const roverIcon = L.divIcon({
            className: 'rover-icon',
            html: `<div style="font-size: 24px;">🚜</div>`, // Simple emoji for now
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        roverMarker = L.marker([lat, lng], { icon: roverIcon }).addTo(map);
    } else {
        roverMarker.setLatLng([lat, lng]);
    }

    // Keep rover in view if needed, or just let user pan
    // map.panTo([lat, lng]);
}

export function panTo(lat, lng) {
    map.setView([lat, lng], 18); // Zoom in close directly
}

let userMarker = null;

export function updateUserLocation(lat, lng, accuracy) {
    if (userMarker) {
        userMarker.setLatLng([lat, lng]);
    } else {
        userMarker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: "#3b82f6",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 1
        }).addTo(map);
    }
}
