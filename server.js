const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const authRoutes = require("./src/routes/auth");
const orderRoutes = require("./src/routes/orders");
const routeRoutes = require("./src/routes/routes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/routes", routeRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Delivery Route Planner API is running!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
