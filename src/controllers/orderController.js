const supabase = require("../supabaseClient");

// ─── CREATE ORDER ───────────────────────────────────
// POST /api/orders
// Any logged-in user can place an order
const createOrder = async (req, res) => {
  const {
    pickup_address,
    pickup_lat,
    pickup_lng,
    drop_address,
    drop_lat,
    drop_lng,
    priority,
  } = req.body;

  // Basic validation — make sure required fields exist
  if (!pickup_address || !drop_address || !pickup_lat || !drop_lat) {
    return res.status(400).json({
      error:
        "pickup_address, drop_address, pickup_lat, pickup_lng, drop_lat, drop_lng are required",
    });
  }
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_id: req.user.id,
      pickup_address,
      pickup_lat,
      pickup_lng,
      drop_address,
      drop_lat,
      drop_lng,
      priority: priority || "normal",
      status: "pending",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ message: "Order created", order: data });
};
// ─── LIST ALL ORDERS ────────────────────────────────
// GET /api/orders
// Admin sees all orders, rider sees their orders,
// customer sees their own orders
const getOrders = async (req, res) => {
  let query = supabase
    .from("orders")
    .select(
      `
    *,
    riders ( id, phone, users ( name ) )
  `,
    )
    .order("created_at", { ascending: false });

  // Filter by role — customers only see their own orders
  if (req.user.role === "customer") {
    query = query.eq("customer_id", req.user.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ orders: data });
};
// ─── ASSIGN ORDER TO RIDER ──────────────────────────
// PATCH /api/orders/:id/assign
// Admin only — picks the nearest available rider
const assignOrder = async (req, res) => {
  const { id } = req.params;

  // 1. Get the order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (orderErr || !order)
    return res.status(404).json({ error: "Order not found" });

  // 2. Get all available riders with their location
  const { data: riders, error: riderErr } = await supabase
    .from("riders")
    .select("*")
    .eq("is_available", true);
  if (riderErr || !riders.length)
    return res.status(400).json({ error: "No available riders" });

  // 3. Find nearest rider using Haversine distance formula
  // This is the Assignment Problem from Operations Research!
  const nearest = findNearestRider(riders, order.pickup_lat, order.pickup_lng);

  // 4. Assign the order to that rider
  const { data: updated, error: updateErr } = await supabase
    .from("orders")
    .update({ rider_id: nearest.id, status: "assigned" })
    .eq("id", id)
    .select()
    .single();
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  res.json({ message: "Order assigned", order: updated, rider: nearest });
};

// ─── UPDATE ORDER STATUS ────────────────────────────
// PATCH /api/orders/:id/status
// Rider updates their delivery status
const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "assigned", "in_transit", "delivered"];
  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status value" });

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Status updated", order: data });
};

// ─── HELPER: Haversine distance formula ─────────────
// Calculates distance in km between two lat/lng points
// This is used by the Assignment algorithm above
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestRider(riders, pickupLat, pickupLng) {
  return riders.reduce(
    (nearest, rider) => {
      const dist = haversine(
        pickupLat,
        pickupLng,
        rider.current_lat || 27.7172,
        rider.current_lng || 85.324,
      );
      return dist < nearest.dist ? { ...rider, dist } : nearest;
    },
    { ...riders[0], dist: Infinity },
  );
}

module.exports = { createOrder, getOrders, assignOrder, updateStatus };
