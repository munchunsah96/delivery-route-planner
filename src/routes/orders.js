const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  createOrder,
  getOrders,
  assignOrder,
  updateStatus,
} = require("../controllers/orderController");

// POST /api/orders — any logged in user can create
router.post("/", protect, createOrder);

// GET /api/orders — logged in users see their orders
router.get("/", protect, getOrders);

// PATCH /api/orders/:id/assign — admin only
router.patch("/:id/assign", protect, adminOnly, assignOrder);

// PATCH /api/orders/:id/status — rider or admin
router.patch("/:id/status", protect, updateStatus);
module.exports = router;
