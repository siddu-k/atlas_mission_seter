// js/app.js
import { initMap, enableDrawing, clearMap, getWaypoints, updatePath, updateRoverPosition, panTo, updateUserLocation } from './map.js';
import { calculateStats } from './ai.js';
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
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Initializing GPS...';

        // BURST MODE: Watch GPS for 5 seconds and pick best accuracy
        let bestPosition = null;
        let watchId = null;
        const BURST_DURATION = 5000;
        const TARGET_ACCURACY = 15; // Meters

        const handlePosition = (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            console.log(`GPS Update: ${accuracy}m accuracy`);

            // Keep best position
            if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
                bestPosition = position;

                // Live update if decent
                if (accuracy < 1000) {
                    updateUserLocation(latitude, longitude, accuracy);
                    // Only pan if it's our first lock or very accurate
                    if (!bestPosition || accuracy < 50) {
                        panTo(latitude, longitude);
                    }
                }
            }

            // Feedback
            if (accuracy <= TARGET_ACCURACY) {
                btn.innerHTML = `<i class="ph ph-check"></i> Precise (${Math.round(accuracy)}m)`;
                finishGPS();
            } else {
                btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Refining (${Math.round(accuracy)}m)...`;
            }
        };

        const handleError = (error) => {
            console.warn("GPS Error:", error);
        };

        const finishGPS = () => {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }

            if (bestPosition) {
                const { latitude, longitude, accuracy } = bestPosition.coords;
                updateUserLocation(latitude, longitude, accuracy);
                panTo(latitude, longitude);

                btn.innerHTML = '<i class="ph ph-navigation-arrow"></i> Locate Me';
                btn.classList.add('active');
                setTimeout(() => btn.classList.remove('active'), 2000);
            } else {
                btn.innerHTML = '<i class="ph ph-warning"></i> Failed';
                alert("Could not retrieve a valid location. Please check GPS settings.");
            }
        };

        // Start watching
        watchId = navigator.geolocation.watchPosition(
            handlePosition,
            handleError,
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );

        // Stop after burst duration
        setTimeout(() => {
            if (watchId) finishGPS();
        }, BURST_DURATION);
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        clearMap();
        state.waypoints = [];
        updateStats();
        ui.feedback.classList.add('hidden');
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
