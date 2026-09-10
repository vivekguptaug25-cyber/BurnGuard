# BurnGuard – AI-Driven Semiconductor Component Burn-in & Screening Anomaly Detection System

A comprehensive AI/ML platform for real-time anomaly detection, risk assessment, and automated engineering diagnostics during semiconductor component burn-in and screening operations.

---

## 1. Project Information

- **Project Title:** BurnGuard – AI-Driven Semiconductor Component Burn-in & Screening Anomaly Detection System
- **PS ID:** SIH2026-DEMO-001 *(Update with your official PS ID)*
- **PS Title:** Semiconductor Component Burn-in Anomaly Detection & Reliability Screening *(Update with your official PS Title)*
- **Category:** Software
- **Theme:** Smart Automation / Advanced Electronics *(Update with your official Theme)*

---

## 2. Problem Statement

Semiconductor burn-in and stress testing are essential manufacturing quality steps designed to weed out infant mortality defects prior to field deployment. However, standard testing often relies on rigid, static threshold limits that either fail to detect subtle multivariate drift or trigger excessive false positives. Manual analysis of multi-point electrical and thermal telemetry across thousands of components is slow, error-prone, and lacks real-time diagnostic intelligence.

---

## 3. Proposed Solution

**BurnGuard** provides an intelligent, three-tier automated screening solution:
1. Captures multi-point electrical and thermal telemetry ($T_1 \to T_5$: Temperature, Voltage, Current, Power).
2. Deploys an unsupervised **Isolation Forest Machine Learning Pipeline** to detect multidimensional outliers and predict anomalous behavior without needing labeled failure datasets.
3. Quantifies risk into normalized **Anomaly Scores** ($0 - 100$) and categorizes health into severity bands (Critical, High, Moderate, Nominal).
4. Generates an automated **AI Semiconductor Reliability Report** powered by Groq LLMs (`llama-3.3-70b`), pinpointing root physical failure mechanisms and recommending actionable screening procedures.

---

## 4. Key Features

- **Sequential Telemetry Tracking:** Dynamic 5-interval ($T_1 \to T_5$) recording of Temperature, Operating Voltage, Current, and Dissipated Power.
- **Unsupervised ML Anomaly Detection:** Pre-trained Scikit-Learn Isolation Forest pipeline (`StandardScaler` + `IsolationForest`) trained on $10,000+$ burn-in component data points.
- **Failure Risk & Health Gauge:** Calculates weighted failure probabilities and parameter deviation levels with real-time status cues.
- **Automated Root Cause Diagnostics:** Rule-based diagnostic heuristics for thermal runaway, supply instability, and overcurrent conditions.
- **LLM-Powered Engineering Reports:** Context-aware engineering assessments generated via Groq (`llama-3.3-70b-versatile`).
- **Interactive Visualizations:** High-performance responsive trend curves and parameter bands built with Recharts and Tailwind CSS.

---

## 5. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts
- **Backend Gateway:** Node.js, Express, Axios, Dotenv, CORS
- **ML & Analytics Service:** Python 3.10+, FastAPI, Uvicorn, Scikit-Learn, Pandas, NumPy, Joblib
- **LLM Engine:** Groq API (`llama-3.3-70b-versatile`)
- **Dataset:** Semiconductor Burn-in Component Database ($10,000+$ records)

---

## 6. Architecture

See [docs/architecture.md](docs/architecture.md).

```text
Telemetry / User Input (T1 - T5 Readings)
  |
  v
Frontend (React 19 + Vite) [:8443]
  |
  |  POST /api/analyze
  v
Backend API Gateway (Express) [:5000]
  |
  |  POST /predict
  v
ML Microservice (FastAPI) [:8000]
  |
  +------------------> Isolation Forest Model (StandardScaler + IsolationForest)
  |
  +------------------> Groq AI Engineering Engine (Llama-3.3-70b)
  |
  v
Interactive Diagnostics & Root Cause Dashboard (Frontend)
```

---

## 7. Repository Structure

```text
BurnGuard/
├── README.md                   # Main project overview and setup guide
├── SUBMISSION_GUIDE.md         # SIH submission checklist and instructions
├── LICENSE                     # MIT License
├── .gitignore                  # Git ignore rules for node_modules, .env, etc.
├── .env.example                # Sample environment configuration template
├── backend/                    # Node.js Express API gateway & reverse proxy
│   ├── server.js
│   └── package.json
├── frontend/                   # React + TypeScript + Vite user interface
│   ├── src/
│   │   ├── App.tsx             # Interactive dashboard and telemetry form
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
├── ml_service/                 # FastAPI ML service and training pipeline
│   ├── ml_service.py           # FastAPI prediction API
│   ├── ai_report.py            # Groq LLM engineering report generator
│   ├── trainmodel.py           # Model training script
│   ├── requirements.txt        # Python dependencies
│   ├── model/                  # Serialized Isolation Forest model (.pkl)
│   └── data/                   # Burn-in component database CSV
├── docs/                       # Architecture & technical documentation
│   └── architecture.md
├── assets/                     # Project screenshots & media
│   └── screenshots/
│       └── README.md
└── submission/                 # SIH presentation & demo video links
    ├── PRESENTATION.md
    └── DEMO.md
```

### What goes where?

| Item | Location |
|---|---|
| Source code | `frontend/`, `backend/`, `ml_service/` |
| Architecture / technical documentation | `docs/` |
| Project screenshots / UI photos | `assets/screenshots/` |
| Final PPT / presentation | `submission/` |
| Demo video link | `submission/DEMO.md` |
| Project overview & setup | `README.md` |

---

## 8. Final Presentation

Keep your final SIH presentation in the repository whenever the file size allows it.

See [submission/PRESENTATION.md](submission/PRESENTATION.md) for details.

- **Presentation File:** [Open Final Presentation](submission/PRESENTATION.md)
- *If the PPT file is larger than 25 MB, provide an accessible Google Drive / OneDrive viewer link inside `submission/PRESENTATION.md`.*

---

## 9. Demo Video

A demo video is **optional**, but strongly recommended.

Add your accessible YouTube or Google Drive link in [submission/DEMO.md](submission/DEMO.md).

---

## 10. Screenshots / Prototype Photos

Screenshots of the application screens are located in:

`assets/screenshots/`

See [assets/screenshots/README.md](assets/screenshots/README.md) for screenshot guidelines and references.

---

## 11. Installation

### 1. Clone Repository & Setup Environment
```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
cp .env.example .env
# Edit .env and configure your GROQ_API_KEY (optional, for AI reports)
```

### 2. Setup Python ML Service
```bash
cd ml_service
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
python trainmodel.py
```

### 3. Setup Express Backend
```bash
cd ../backend
npm install
```

### 4. Setup Frontend
```bash
cd ../frontend
npm install
```

---

## 12. Run

Start the three services in separate terminals:

### Terminal 1: ML Service (Port 8000)
```bash
cd ml_service
.\.venv\Scripts\Activate.ps1
uvicorn ml_service:app --host 0.0.0.0 --port 8000 --reload
```
- Health / status: `http://localhost:8000/`

### Terminal 2: Backend Gateway (Port 5000)
```bash
cd backend
npm start
```
- Health endpoint: `http://localhost:5000/api/health`

### Terminal 3: Frontend Client (Port 8443)
```bash
cd frontend
npm run dev
```
- Open browser at: **`http://localhost:8443/`**

---

## 13. Future Scope

1. **Automated ATE (Automated Test Equipment) Integration:** Direct ingestion of real-time MQTT/Modbus protocols from hardware burn-in chambers.
2. **Temporal Multi-Step LSTM / Autoencoders:** Upgrading from static reading assessment to continuous sequential time-series anomaly forecasting ($\frac{\Delta T}{\Delta t}$).
3. **Automated Lot Disposition & PDF Export:** One-click generation of digitally signed engineering quality certificates for compliant semiconductor batches.

---

## Important

Before submission, make sure the repository is accessible to reviewers (public). Do **not** upload passwords, API keys, access tokens, `.env` files containing secrets, or other confidential credentials.
