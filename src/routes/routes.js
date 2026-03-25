const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const { protect } = require("../middleware/auth");
const { nearestNeighbourTSP } = require("../algorithms/tsp");

// POST /api/routes/optimise
// Body: { rider_id, origin: { lat, lng } }
// Takes all assigned orders for a rider and returns optimal route
router.post("/optimise", protect, async (req, res) => {
  const { rider_id, origin } = req.body;

  if (!rider_id || !origin?.lat || !origin?.lng) {
    return res.status(400).json({
      error: "rider_id and origin { lat, lng } are required",
    });
  }
  // 1. Get all orders assigned to this rider that are not yet delivered
  const { data: orders, error: ordErr } = await supabase
    .from("orders")
    .select("id, drop_address, drop_lat, drop_lng")
    .eq("rider_id", rider_id)
    .in("status", ["assigned", "in_transit"]);

  if (ordErr) return res.status(500).json({ error: ordErr.message });

  if (!orders.length)
    return res.status(404).json({ error: "No active orders for this rider" });

  // 2. Convert orders to stops format for TSP algorithm
  const stops = orders.map((o) => ({
    id: o.id,
    lat: o.drop_lat,
    lng: o.drop_lng,
    address: o.drop_address,
  }));
  // 3. Run the TSP algorithm — this is the core computation
  const result = nearestNeighbourTSP(origin, stops);

  // 4. Save the route to the routes table
  const { data: savedRoute, error: saveErr } = await supabase
    .from("routes")
    .insert({
      rider_id,
      order_sequence: result.orderedStops.map((s) => s.id),
      total_distance_km: result.totalDistanceKm,
    })
    .select()
    .single();

  if (saveErr) return res.status(500).json({ error: saveErr.message });
  // 5. Return the full optimised route to the frontend
  res.json({
    message: "Route optimised",
    route_id: savedRoute.id,
    totalDistanceKm: result.totalDistanceKm,
    legs: result.legs,
    orderedStops: result.orderedStops,
  });
});

// GET /api/routes/rider/:rider_id
// Get the latest saved route for a rider
router.get("/rider/:rider_id", protect, async (req, res) => {
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .eq("rider_id", req.params.rider_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return res.status(404).json({ error: "No route found" });
  res.json({ route: data });
});

module.exports = router;
