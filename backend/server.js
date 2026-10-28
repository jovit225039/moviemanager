import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import movieRoutes from "./routes/movies.js";

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: false
}));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "ReelPlan API is running.", data: null });
});

app.use("/api/movies", movieRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Unexpected server error.",
    data: null
  });
});

async function boot() {
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes("YOUR_")) {
    throw new Error("MONGODB_URI is missing. Add a MongoDB Atlas test URI to backend/.env.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected.");
  app.listen(port, () => console.log(`ReelPlan API listening on port ${port}`));
}

boot().catch((error) => {
  console.error("Startup failed:", error.message);
  process.exit(1);
});
