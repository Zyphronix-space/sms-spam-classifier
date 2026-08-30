"""
FastAPI backend that serves spam/ham predictions from the trained model,
and (for logged-in users) persists scan metadata to PostgreSQL.

Run with:
    uvicorn main:app --reload
"""

import hashlib
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()  # must run before importing auth/db, which read env vars at import time

import auth
import db
from routers import admin, auth_routes, model as model_router, scans, stats
from routers.model import _read_json


# Locally, ml/ is a sibling of backend/. In the Azure deployment package only
# backend/ is uploaded, with the model artifacts bundled at backend/ml/
# instead — support both layouts.
_SIBLING_ML_DIR = Path(__file__).resolve().parent.parent / "ml"
_BUNDLED_ML_DIR = Path(__file__).resolve().parent / "ml"
MODEL_DIR = _SIBLING_ML_DIR if _SIBLING_ML_DIR.exists() else _BUNDLED_ML_DIR
model = joblib.load(MODEL_DIR / "spam_model.joblib")
vectorizer = joblib.load(MODEL_DIR / "vectorizer.joblib")
SPAM_INDEX = list(model.classes_).index("spam")

# Populated at startup from ml/evaluation.json so scans can be linked to the
# model version that produced them.
MODEL_VERSION_ID: str | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.pool.open()
    global MODEL_VERSION_ID
    evaluation = _read_json("evaluation.json")
    if evaluation is not None:
        try:
            with db.pool.connection() as conn:
                row = conn.execute(
                    """
                    INSERT INTO model_versions
                        (model_name, version, accuracy, precision_score, recall, f1_score)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (model_name, version) DO UPDATE SET
                        accuracy = EXCLUDED.accuracy,
                        precision_score = EXCLUDED.precision_score,
                        recall = EXCLUDED.recall,
                        f1_score = EXCLUDED.f1_score
                    RETURNING id
                    """,
                    (
                        evaluation["model_name"],
                        evaluation["version"],
                        evaluation["metrics"]["accuracy"],
                        evaluation["metrics"]["precision"],
                        evaluation["metrics"]["recall"],
                        evaluation["metrics"]["f1"],
                    ),
                ).fetchone()
                MODEL_VERSION_ID = str(row[0])
        except Exception:
            MODEL_VERSION_ID = None
    yield
    db.pool.close()


app = FastAPI(title="SMS Spam Classifier API", lifespan=lifespan)

# Allow the React dev server to call this API from the browser.
# In practice the browser only ever calls the Ballerina gateway (:9000) —
# this stays in place for direct local testing of the backend in isolation.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(scans.router)
app.include_router(stats.router)
app.include_router(model_router.router)
app.include_router(admin.router)


class MessageInput(BaseModel):
    message: str = Field(..., min_length=1, description="The SMS text to classify")


class PredictionResponse(BaseModel):
    label: str
    spam_probability: float


@app.get("/health")
def health():
    return {"status": "ok", "database": "connected" if db.db_is_healthy() else "unavailable"}


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: MessageInput, user: dict | None = Depends(auth.get_current_user_optional)):
    x = vectorizer.transform([payload.message])
    label = model.predict(x)[0]
    spam_probability = round(float(model.predict_proba(x)[0][SPAM_INDEX]), 4)

    if user is not None:
        message_hash = hashlib.sha256(payload.message.encode("utf-8")).hexdigest()
        try:
            with db.pool.connection() as conn:
                conn.execute(
                    """
                    INSERT INTO scans
                        (user_id, model_version_id, classification, spam_probability, message_hash)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (user["sub"], MODEL_VERSION_ID, label, spam_probability, message_hash),
                )
        except Exception:
            # Persistence is best-effort: a DB hiccup should never break a prediction.
            pass

    return PredictionResponse(label=label, spam_probability=spam_probability)
