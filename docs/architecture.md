# System Architecture

## High-level Flow

```text
Telemetry / User Input (T1 - T5 Readings)
  |
  v
Frontend (React 19 + Vite + Tailwind CSS + Recharts) [Port 8443]
  |
  |  POST /api/analyze
  v
Backend API Gateway (Node.js / Express) [Port 5000]
  |
  |  POST /predict
  v
ML Microservice (FastAPI + Python) [Port 8000]
  |
  +------------------> Isolation Forest Pipeline (Scikit-Learn)
  |                    - StandardScaler + IsolationForest
  |                    - Anomaly Score (0-100) & Parameter Thresholds
  |
  +------------------> Groq AI Engineering Engine (Llama-3.3-70b)
  |                    - Semiconductor Reliability Expert Assessment
  |
  v
Interactive Diagnostics & Root Cause Dashboard (Frontend)
```

## System Components

### 1. Frontend Client (`frontend/`)
- **Technology:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts.
- **Role:** Handles sequential burn-in telemetry input across 5 intervals ($T_1 \to T_5$), visualizes real-time metric trends, computes heuristic parameter health, and renders root cause breakdowns with Groq AI reliability reports.

### 2. Backend Gateway (`backend/`)
- **Technology:** Node.js, Express, Axios, CORS, Dotenv.
- **Role:** Acts as an API gateway & reverse proxy. Handles secure environment configuration, path-safe `.env` loading, request timeout management (30s for LLM processing), CORS verification, and health diagnostics (`/api/health`).

### 3. Machine Learning Microservice (`ml_service/`)
- **Technology:** Python 3.10+, FastAPI, Uvicorn, Scikit-Learn, Pandas, NumPy, Joblib.
- **Role:** Implements an unsupervised **Isolation Forest** pipeline trained on $10,000+$ semiconductor burn-in component readings across Voltage, Current, Temperature, and Power. Evaluates multidimensional outliers and computes normalized anomaly scores and failure risk levels.

### 4. AI Engineering Report Engine (`ml_service/ai_report.py`)
- **Technology:** Groq Cloud API (`llama-3.3-70b-versatile`).
- **Role:** Translates raw numeric anomalies and electrical deviations into an actionable semiconductor engineering assessment (underlying physical failure mode, thermal stress indicators, and screening/burn-in recommendations).
