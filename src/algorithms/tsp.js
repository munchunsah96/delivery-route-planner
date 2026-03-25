// ============================================================
// TSP — Nearest Neighbour Heuristic
// Used for: Delivery Route Optimisation
// OR connection: Transportation Problem (minimize travel cost)
// Time complexity: O(n²)
// ============================================================

// Haversine formula — calculates real-world distance
// between two GPS coordinates in kilometres
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Main TSP function
// Input:
//   origin  — { lat, lng } — rider's starting position
//   stops   — array of { id, lat, lng, address }
// Output:
//   { orderedStops, totalDistanceKm, legs }
function nearestNeighbourTSP(origin, stops) {
  if (!stops || stops.length === 0) {
    return { orderedStops: [], totalDistanceKm: 0, legs: [] };
  }

  if (stops.length === 1) {
    const dist = haversine(origin.lat, origin.lng, stops[0].lat, stops[0].lng);
    return {
      orderedStops: [stops[0]],
      totalDistanceKm: parseFloat(dist.toFixed(2)),
      legs: [{ from: "origin", to: stops[0].id, distanceKm: dist.toFixed(2) }],
    };
  }

  // Track which stops have been visited
  const visited = new Set();
  const orderedStops = [];
  const legs = [];
  let totalDistance = 0;

  // Start from the rider's origin position
  let currentLat = origin.lat;
  let currentLng = origin.lng;
  let currentId = "origin";

  // Keep visiting stops until all are done
  while (visited.size < stops.length) {
    let nearestStop = null;
    let nearestDist = Infinity;

    // Step 2: Find the closest unvisited stop
    for (const stop of stops) {
      if (visited.has(stop.id)) continue; // skip already visited

      const dist = haversine(currentLat, currentLng, stop.lat, stop.lng);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestStop = stop;
      }
    }
    // Step 3: Move to that stop
    visited.add(nearestStop.id);
    orderedStops.push(nearestStop);
    totalDistance += nearestDist;

    legs.push({
      from: currentId,
      to: nearestStop.id,
      address: nearestStop.address,
      distanceKm: parseFloat(nearestDist.toFixed(2)),
    });

    // Update current position for next iteration
    currentLat = nearestStop.lat;
    currentLng = nearestStop.lng;
    currentId = nearestStop.id;
  }

  return {
    orderedStops,
    totalDistanceKm: parseFloat(totalDistance.toFixed(2)),
    legs,
  };
}

module.exports = { nearestNeighbourTSP, haversine };
