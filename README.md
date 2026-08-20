# SMS Spam Classifier

A full-stack machine learning app that classifies text messages as spam or
ham (not spam), trained on the classic
[SMS Spam Collection dataset](https://archive.ics.uci.edu/dataset/228/sms+spam+collection)
(5,500+ labeled real SMS messages).

- **`ml/`** — trains and evaluates the model.
  - `train_model.py` converts messages to TF-IDF features and trains a
    Multinomial Naive Bayes classifier (80/20 train/test split), then saves
    it with `joblib`.
  - `compare_models.py` benchmarks Naive Bayes against Logistic Regression
    on the same data (accuracy and F1 score).
  - `predict.py` loads the saved model and classifies a few example messages.
- **`backend/`** — a FastAPI service that loads the trained model and exposes
  a `POST /predict` endpoint.
- **`frontend/`** — a React (Vite) app where a user pastes a message and gets
  back a spam/not-spam prediction with a confidence score.

## Running it

**Train the model** (only needed once, or after changing `ml/train_model.py`):
```
cd ml
python train_model.py
```

**Backend:**
```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```
cd frontend
npm install
npm run dev
```

Then open the frontend URL (default `http://localhost:5173`) in a browser.

## What this demonstrates

- Turning raw text into numeric features with TF-IDF
- Training and evaluating a classification model (accuracy, precision,
  recall, F1, confusion matrix — not just accuracy, since the classes are
  imbalanced: ~87% ham vs ~13% spam)
- Comparing model choices (Naive Bayes vs Logistic Regression) on the same
  test set before picking one
- Serializing and serving a trained model behind a REST API
- Connecting a trained ML model to a real user-facing frontend
