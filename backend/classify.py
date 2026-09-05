"""The one place that calls the trained model. Both `POST /predict` (stateless)
and `POST /messages` (persisted) go through this, so there is exactly one
TF-IDF-vectorize -> MultinomialNB.predict/predict_proba code path — never two
copies that could quietly drift apart."""

from pathlib import Path

import joblib

# Locally, ml/ is a sibling of backend/. In the Azure deployment package only
# backend/ is uploaded, with the model artifacts bundled at backend/ml/
# instead — support both layouts (unchanged from the original main.py logic).
_SIBLING_ML_DIR = Path(__file__).resolve().parent.parent / "ml"
_BUNDLED_ML_DIR = Path(__file__).resolve().parent / "ml"
MODEL_DIR = _SIBLING_ML_DIR if _SIBLING_ML_DIR.exists() else _BUNDLED_ML_DIR

model = joblib.load(MODEL_DIR / "spam_model.joblib")
vectorizer = joblib.load(MODEL_DIR / "vectorizer.joblib")
SPAM_INDEX = list(model.classes_).index("spam")


def classify(message: str) -> tuple[str, float]:
    """Returns (label, spam_probability) for one SMS message body."""
    x = vectorizer.transform([message])
    label = model.predict(x)[0]
    spam_probability = round(float(model.predict_proba(x)[0][SPAM_INDEX]), 4)
    return label, spam_probability
