from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "burn_in_component_database.csv"
MODEL_FILE = BASE_DIR / "model" / "isolation_forest.pkl"
FEATURES_FILE = BASE_DIR / "model" / "features.pkl"

FEATURES = ["Temperature", "Voltage", "Current", "Power"]


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_FILE}")

    df = pd.read_csv(DATA_FILE)

    missing = [column for column in FEATURES if column not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}. Found: {list(df.columns)}")

    X = df[FEATURES].apply(pd.to_numeric, errors="coerce").dropna()

    if X.empty:
        raise ValueError("No valid training rows found.")

    model = Pipeline([
        ("scaler", StandardScaler()),
        (
            "model",
            IsolationForest(
                n_estimators=300,
                contamination=0.02,
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ])

    model.fit(X)

    MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_FILE)
    joblib.dump(FEATURES, FEATURES_FILE)

    predictions = model.predict(X)
    normal = int((predictions == 1).sum())
    anomalies = int((predictions == -1).sum())

    print("================================")
    print("BurnGuard model trained")
    print("================================")
    print(f"Samples: {len(X)}")
    print(f"Normal: {normal}")
    print(f"Anomalies: {anomalies}")
    print(f"Anomaly rate: {(anomalies / len(X)) * 100:.2f}%")
    print(f"Model saved: {MODEL_FILE}")
    print(f"Features saved: {FEATURES_FILE}")


if __name__ == "__main__":
    main()
