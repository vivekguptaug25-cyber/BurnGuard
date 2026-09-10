# BurnGuard - Fixed Project

## Architecture

Frontend (Vite) :8443
-> Express backend :5000
-> FastAPI ML service :8000
-> Isolation Forest model
-> Groq engineering report (optional)

## 1. Environment

Copy `.env.example` to `.env` at the project root and set your own `GROQ_API_KEY`.

Do NOT commit `.env` to Git.

## 2. ML service

Open PowerShell in `ml_service`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python trainmodel.py
uvicorn ml_service:app --host 0.0.0.0 --port 8000 --reload
```

Test: http://localhost:8000/

## 3. Backend

Open another PowerShell in `backend`:

```powershell
npm install
npm start
```

Test: http://localhost:5000/

Health: http://localhost:5000/api/health

## 4. Frontend

Open another PowerShell in `frontend`:

```powershell
npm install
npm run dev
```

Open http://localhost:8443/

## Fixed issues

- Frontend now calls Express `/api/analyze`, not FastAPI `/api/analyze`.
- Express forwards `/api/analyze` to FastAPI `/predict`.
- CORS no longer uses a trailing slash in the origin.
- Express uses `ML_SERVICE_URL` consistently.
- FastAPI loads `model/isolation_forest.pkl` with a fallback to the old filename.
- Frontend/ML request now uses `power` instead of `leakage`.
- Frontend model inputs are aligned with the supplied 5 V / ~0.2 A dataset.
- AI report no longer references the removed `leakage` field.
- Missing Python dependencies were added to `requirements.txt`.
- Model is retrained and saved as `model/isolation_forest.pkl`.
- Health endpoint added to the Express backend.
- Project-level `.env` loading is path-safe.
