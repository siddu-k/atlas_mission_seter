// js/app.js
import { initMap, enableDrawing, clearMap, getWaypoints, updatePath, updateRoverPosition, panTo, updateUserLocation } from './map.js';
import { optimizePath, calculateStats } from './ai.js';
import { db } from './supabase-client.js';

// Application State
const state = {
    waypoints: [],
    missionName: `Mission-${new Date().toISOString().slice(0, 10)}`
};

// UI Elements
const ui = {
    distance: document.getElementById('total-distance'),
    time: document.getElementById('est-time'),
    feedback: document.getElementById('ai-feedback'),
    roverBattery: document.getElementById('rover-battery'),
    roverSignal: document.getElementById('rover-signal'),
    roverHeading: document.getElementById('rover-heading'),
    roverStatus: document.getElementById('rover-status'),
    roverLat: document.getElementById('rover-lat'),
    roverLng: document.getElementById('rover-lng'),
    connection: document.getElementById('connection-status')
};

function init() {
    console.log("ATLAS Mission Planner Initializing...");

    // 1. Initialize Map
    initMap();

    // 2. Enable Drawing
    enableDrawing((waypoints) => {
        state.waypoints = waypoints;
        updateStats();
    });

    // 3. Bind Buttons
    document.getElementById('btn-locate').addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        const btn = document.getElementById('btn-locate');
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Locating...';

        let attempts = 0;
        const maxAttempts = 3;

        const getGPSLocation = () => {
            attempts++;

            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude, accuracy } = position.coords;

                // Detailed logging
                console.log(`=== GPS ATTEMPT ${attempts} ===`);
                console.log("Latitude:", latitude);
                console.log("Longitude:", longitude);
                console.log("Accuracy:", accuracy, "meters");
                console.log("Timestamp:", new Date(position.timestamp).toLocaleTimeString());

                // REJECT if accuracy is worse than 500m (likely WiFi/IP, not GPS)
                if (accuracy > 500 && attempts < maxAttempts) {
                    console.warn(`⚠️ Accuracy too low (${Math.round(accuracy)}m) - Retrying for GPS lock...`);
                    btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> GPS ${attempts}/${maxAttempts}...`;
                    setTimeout(getGPSLocation, 1000); // Retry after 1 second
                    return;
                }

                // Warn if still poor after max attempts
                if (accuracy > 500) {
                    console.warn("⚠️ Could not get GPS lock - using best available position");
                    alert(`⚠️ GPS unavailable. Using WiFi/IP location (${Math.round(accuracy)}m accuracy).\n\nFor accurate GPS:\n• Use a mobile device with GPS\n• Enable location services\n• Go outdoors for better signal`);
                }

                updateUserLocation(latitude, longitude, accuracy);
                panTo(latitude, longitude);

                btn.innerHTML = '<i class="ph ph-navigation-arrow"></i> Locate Me';
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 2000);

            }, (error) => {
                console.error("GPS Error:", error);
                if (attempts < maxAttempts) {
                    console.log(`Retrying... (${attempts}/${maxAttempts})`);
                    setTimeout(getGPSLocation, 1000);
                } else {
                    alert("Could not get location. Ensure GPS is enabled.");
                    btn.innerHTML = '<i class="ph ph-warning"></i> Error';
                }
            }, {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            });
        };

        getGPSLocation();
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        clearMap();
        state.waypoints = [];
        updateStats();
        ui.feedback.classList.add('hidden');
    });

    document.getElementById('btn-optimize').addEventListener('click', () => {
        if (state.waypoints.length < 3) {
            alert("Need at least 3 waypoints to optimize!");
            return;
        }

        const result = optimizePath(state.waypoints);
        updatePath(result.optimizedWaypoints);

        // Show AI Feedback
        ui.feedback.innerHTML = `
            <strong>AI Optimization Complete</strong><br>
            Path re-routed for efficiency.<br>
            Distance Saved: ${result.savedDistance} km
        `;
        ui.feedback.classList.remove('hidden');

        // Update stats based on optimized path
        const newStats = calculateStats(result.optimizedWaypoints);
        ui.distance.innerText = `${newStats.distanceKm} km`;
        ui.time.innerText = `~${newStats.estTimeMin} min`;
    });

    document.getElementById('btn-save').addEventListener('click', async () => {
        if (state.waypoints.length === 0) return;

        const btn = document.getElementById('btn-save');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Saving...';

        const mission = await db.saveMission(state.missionName, state.waypoints);

        if (mission) {
            alert(`Mission "${mission.name}" saved to Supabase!`);
        } else {
            alert("Failed to save mission. Check console for details.");
        }

        btn.innerHTML = originalText;
    });

    // 4. Setup Telemetry
    setupTelemetry();
}

function updateStats() {
    const stats = calculateStats(state.waypoints);
    ui.distance.innerText = `${stats.distanceKm} km`;
    ui.time.innerText = `~${stats.estTimeMin} min`;
}

function setupTelemetry() {
    // Initial fetch
    db.getLatestTelemetry().then(data => {
        if (data) updateTelemetryUI(data);
    });

    // Real-time subscription
    db.subscribeToTelemetry((data) => {
        updateTelemetryUI(data);
    });
}

function updateTelemetryUI(data) {
    if (!data) return;

    ui.roverBattery.innerText = `${data.battery_level}%`;
    ui.roverSignal.innerText = `${data.signal_strength} dBm`; // Corrected property name from schema
    ui.roverHeading.innerText = `${data.heading?.toFixed(0)}°`;
    ui.roverStatus.innerText = data.status.toUpperCase();
    ui.roverLat.innerText = data.lat.toFixed(6);
    ui.roverLng.innerText = data.lng.toFixed(6);

    // Color coding for battery
    if (data.battery_level < 20) ui.roverBattery.style.color = 'var(--danger-color)';
    else if (data.battery_level < 50) ui.roverBattery.style.color = 'var(--warning-color)';
    else ui.roverBattery.style.color = 'var(--success-color)';

    // Update Map
    updateRoverPosition(data.lat, data.lng, data.heading);

    // Pulse animation for connection
    const dot = document.querySelector('.status-badge .dot');
    dot.style.boxShadow = '0 0 12px var(--success-color)';
    setTimeout(() => {
        dot.style.boxShadow = '0 0 8px var(--success-color)';
    }, 500);
}

// Start App
init();
