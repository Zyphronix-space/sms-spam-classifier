"""
FastAPI backend that serves spam/ham predictions from the trained model.
Logged-in users' messages and predictions are persisted via routers/messages.py.

Run with:
    uvicorn main:app --reload
"""

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()  # must run before importing auth/db, which read env vars at import time

import classify
import db
import model_state
from routers import admin, auth_routes, batch, dashboard, feedback, messages, model as model_router
from routers.model import _read_json


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.pool.open()
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
                model_state.MODEL_VERSION_ID = str(row[0])
        except Exception:
            model_state.MODEL_VERSION_ID = None
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
    allow_credentials=True,
)

app.include_router(auth_routes.router)
app.include_router(messages.router)
app.include_router(feedback.router)
app.include_router(batch.router)
app.include_router(dashboard.router)
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
def predict(payload: MessageInput):
    """Stateless classify-only endpoint — same model, same response shape as
    before. No longer persists anything: a logged-in user's classify-and-save
    flow now goes through POST /messages instead (see routers/messages.py),
    which stores the message text itself rather than a hash. Anonymous users
    still call this directly and keep their own browser-local history."""
    label, spam_probability = classify.classify(payload.message)
    return PredictionResponse(label=label, spam_probability=spam_probability)
