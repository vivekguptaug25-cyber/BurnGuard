from pathlib import Path
import os

import joblib
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_report import generate_engineering_report

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

app = FastAPI(title="BurnGuard ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8443",
        "http://127.0.0.1:8443",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = BASE_DIR / "model" / "isolation_forest.pkl"
if not MODEL_PATH.exists():
    # Backward-compatible fallback for the old model filename.
    MODEL_PATH = BASE_DIR / "model" / "isolation_forest(1).pkl"

try:
    model = joblib.load(MODEL_PATH)
except Exception as exc:
    raise RuntimeError(f"Could not load ML model from {MODEL_PATH}: {exc}") from exc


class Reading(BaseModel):
    temperature: float
    voltage: float
    current: float
    power: float
    component_type: str = "Unknown"


def calculate_status(value: float, warn: float, critical: float, direction: str = "above") -> str:
    if direction == "above":
        if value >= critical:
            return "critical"
        if value >= warn:
            return "warning"
        return "normal"

    if value <= critical:
        return "critical"
    if value <= warn:
        return "warning"
    return "normal"


@app.get("/")
def root():
    return {
        "service": "BurnGuard ML Service",
        "status": "running",
        "model": MODEL_PATH.name,
    }


@app.post("/predict")
def predict(reading: Reading):
    try:
        X = pd.DataFrame(
            [{
                "Temperature": reading.temperature,
                "Voltage": reading.voltage,
                "Current": reading.current,
                "Power": reading.power,
            }]
        )

        prediction = int(model.predict(X)[0])
        decision_score = float(model.decision_function(X)[0])

        # Isolation Forest decision_function is centered around 0 for
        # the estimator. More negative values are more anomalous.
        anomaly_score = float(max(0.0, min(100.0, (0.5 - decision_score) * 100)))

        # Thresholds match the scale of the supplied training dataset:
        # Temperature ~73 C, Voltage ~5 V, Current ~0.21 A, Power ~1.03 W.
        parameter_status = {
            "temperature": calculate_status(reading.temperature, 80, 90, "above"),
            "voltage": calculate_status(reading.voltage, 4.90, 4.85, "below"),
            "current": calculate_status(reading.current, 0.25, 0.30, "above"),
            "power": calculate_status(reading.power, 1.30, 1.50, "above"),
        }

        statuses = list(parameter_status.values())

        if "critical" in statuses:
            risk_level = "Critical"
        elif "warning" in statuses:
            risk_level = "High"
        elif prediction == -1:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        risk_multiplier = {
            "Critical": 0.95,
            "High": 0.75,
            "Medium": 0.50,
            "Low": 0.20,
        }

        failure_risk = round(
            min(99.0, anomaly_score * risk_multiplier[risk_level]),
            1,
        )

        analysis = {
            "component_type": reading.component_type,
            "temperature": reading.temperature,
            "voltage": reading.voltage,
            "current": reading.current,
            "power": reading.power,
            "anomaly_score": round(anomaly_score, 2),
            "failure_risk": failure_risk,
            "risk_level": risk_level,
            "parameter_status": parameter_status,
        }

        ai_report = generate_engineering_report(analysis)

        return {
            "success": True,
            "anomalyScore": round(anomaly_score, 2),
            "failureRiskPercent": failure_risk,
            "riskLevel": risk_level,
            "parameterStatus": parameter_status,
            "prediction": "anomaly" if prediction == -1 else "normal",
            "aiReport": ai_report,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
