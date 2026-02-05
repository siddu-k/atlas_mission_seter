// js/ai.js

// Calculate Haversine distance between two points (in km)
function getDistance(p1, p2) {
    const R = 6371; // Earth radius in km
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function optimizePath(waypoints) {
    if (waypoints.length < 3) return { optimizedWaypoints: waypoints, savedDistance: 0 };

    // Simple Greedy TSP (Nearest Neighbor) using the first point as start
    let unvisited = [...waypoints];
    const startPoint = unvisited.shift(); // Always start at 0
    let path = [startPoint];

    // Check if it's a loop (Last point == First point)
    const lastPoint = waypoints[waypoints.length - 1];
    const isLoop = (waypoints.length > 2 && getDistance(startPoint, lastPoint) < 0.005); // < 5 meters

    let endPoint = null;

    if (isLoop) {
        // Remove the duplicate end point from 'unvisited' so we don't visit it immediately
        // The nearest neighbor to Start(0,0) is usually End(0,0), which breaks the loop visually
        unvisited.pop();
        endPoint = lastPoint;
    }

    let totalOriginalDist = 0;
    let totalNewDist = 0;

    // Calculate original distance (sequential)
    for (let i = 0; i < waypoints.length - 1; i++) {
        totalOriginalDist += getDistance(waypoints[i], waypoints[i + 1]);
    }

    // Build optimized path
    while (unvisited.length > 0) {
        let last = path[path.length - 1];
        let nearestIdx = 0;
        let minDist = Infinity;

        unvisited.forEach((pt, idx) => {
            const d = getDistance(last, pt);
            if (d < minDist) {
                minDist = d;
                nearestIdx = idx;
            }
        });

        totalNewDist += minDist;
        path.push(unvisited[nearestIdx]);
        unvisited.splice(nearestIdx, 1);
    }

    // If it was a loop, close it at the end
    if (isLoop && endPoint) {
        totalNewDist += getDistance(path[path.length - 1], endPoint);
        path.push(endPoint);
    }

    const savedKm = Math.max(0, totalOriginalDist - totalNewDist);

    return {
        optimizedWaypoints: path,
        savedDistance: savedKm.toFixed(2),
        totalDistance: totalNewDist.toFixed(2)
    };
}

export function calculateStats(waypoints) {
    let dist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
        dist += getDistance(waypoints[i], waypoints[i + 1]);
    }
    // Assume average speed of autonomous rover is ~5 km/h
    const speedKmH = 5;
    const timeHours = dist / speedKmH;
    const timeMins = Math.round(timeHours * 60);

    return {
        distanceKm: dist.toFixed(2),
        estTimeMin: timeMins
    };
}
