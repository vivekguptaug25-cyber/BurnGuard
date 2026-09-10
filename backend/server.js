import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the project-level .env reliably, regardless of where node is started.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

app.use(
  cors({
    origin: ["http://localhost:8443", "http://127.0.0.1:8443"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

const ML_SERVICE_URL = (
  process.env.ML_SERVICE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

app.get("/", (req, res) => {
  res.json({
    service: "BurnGuard Backend",
    status: "running",
    mlService: ML_SERVICE_URL,
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/`, { timeout: 3000 });
    res.json({
      backend: "running",
      mlService: response.data,
    });
  } catch (error) {
    res.status(503).json({
      backend: "running",
      mlService: "unavailable",
      error: error.message,
    });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    console.log("Analysis request:", req.body);

    const response = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      req.body,
      { timeout: 30000 }
    );

    res.json(response.data);
  } catch (error) {
    console.error(
      "ML service error:",
      error.response?.data || error.message
    );

    const status = error.response?.status || 502;

    res.status(status).json({
      success: false,
      message: "Unable to analyze component",
      error: error.response?.data || error.message,
    });
  }
});

const PORT = Number(process.env.BACKEND_PORT || 5000);

app.listen(PORT, () => {
  console.log(`BurnGuard backend running on http://localhost:${PORT}`);
  console.log(`ML service target: ${ML_SERVICE_URL}`);
});
