"""
FastAPI backend that serves spam/ham predictions from the trained model.

Run with:
    uvicorn main:app --reload
"""

from pathlib import Path

import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_DIR = Path(__file__).resolve().parent.parent / "ml"
model = joblib.load(MODEL_DIR / "spam_model.joblib")
vectorizer = joblib.load(MODEL_DIR / "vectorizer.joblib")
SPAM_INDEX = list(model.classes_).index("spam")

app = FastAPI(title="SMS Spam Classifier API")

# Allow the React dev server to call this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class MessageInput(BaseModel):
    message: str = Field(..., min_length=1, description="The SMS text to classify")


class PredictionResponse(BaseModel):
    label: str
    spam_probability: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: MessageInput):
    x = vectorizer.transform([payload.message])
    label = model.predict(x)[0]
    spam_probability = model.predict_proba(x)[0][SPAM_INDEX]
    return PredictionResponse(label=label, spam_probability=round(float(spam_probability), 4))
