# SMS / CLASSIFIER

A full-stack machine learning app that classifies text messages as spam or
ham (not spam), trained on the classic
[SMS Spam Collection dataset](https://archive.ics.uci.edu/dataset/228/sms+spam+collection)
(5,572 labeled real SMS messages). The frontend is an original,
minimalist/technical "security scanner" UI — monochrome, dot-grid, restrained
red accents — not a copy of any vendor's design.

- **`ml/`** — trains and evaluates the model.
  - `train_model.py` converts messages to TF-IDF features and trains a
    Multinomial Naive Bayes classifier (80/20 train/test split), saves it
    with `joblib`, and writes `evaluation.json` (accuracy/precision/recall/F1,
    confusion matrix, dataset counts).
  - `compare_models.py` benchmarks Naive Bayes against Logistic Regression on
    the same data and writes `model_comparison.json`.
  - `predict.py` loads the saved model and classifies a few example messages.
- **`backend/`** — a FastAPI service that loads the trained model, exposes
  `POST /predict`, and (for logged-in users) persists scan metadata to
  PostgreSQL. Internal only — not called directly by the frontend.
- **`gateway/`** — a [Ballerina](https://ballerina.io) API gateway sitting in
  front of the backend. It checks an API key, validates the request shape,
  relays the session cookie both directions, forwards to the FastAPI
  service, and normalizes errors — the same role WSO2 API Manager / Micro
  Integrator play in production between clients and backend services.
- **`frontend/`** — a React (Vite) app: paste a message, get a spam/ham
  prediction with a confidence score, plus batch scanning, scan history,
  statistics, and a model benchmark page. Talks to the gateway, not the
  backend directly.

```
frontend (React)  ->  gateway (Ballerina, :9000)  ->  backend (FastAPI, :8000)
                                                            |
                                              +-------------+-------------+
                                              v                           v
                                     ml/ (joblib model)           PostgreSQL
                                                                (users, scans,
                                                             saved_scans, model_versions)
```

PostgreSQL is used only for **application persistence** — accounts, scan
history, saved scans, model version metadata. It plays no role in inference;
the ML path is always React → Ballerina → FastAPI → TF-IDF → Naive Bayes.

## Running it

**Train the model** (only needed once, or after changing `ml/train_model.py`):
```
cd ml
python train_model.py
python compare_models.py
```

**PostgreSQL** — create a dedicated database + role once:
```sql
CREATE ROLE sms_classifier_app LOGIN PASSWORD 'choose-a-password';
CREATE DATABASE sms_classifier OWNER sms_classifier_app;
```

**Backend:**
```
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL / JWT_SECRET
python migrate.py      # applies migrations/*.sql
uvicorn main:app --reload
```

**Gateway** (requires [Ballerina](https://ballerina.io/downloads/) installed):
```
cd gateway
bal run
```

**Frontend:**
```
cd frontend
npm install
npm run dev
```

Then open the frontend URL (default `http://localhost:5173`) in a browser.
The frontend calls the gateway at `http://localhost:9000` by default — set
`VITE_API_URL` / `VITE_API_KEY` in a `frontend/.env` file to change it.

## Environment variables

`backend/.env` (never commit the real file — see `.env.example`):
```
DATABASE_URL=postgresql://sms_classifier_app:<password>@127.0.0.1:5432/sms_classifier
JWT_SECRET=<long random string>
COOKIE_SECURE=false   # set true once served over HTTPS
```

## API

```
GET  /health              gateway + backend + database status
POST /predict              {message} -> {label, spam_probability}
                            (persists the scan if a session cookie is present)

POST /auth/register        {email, password} -> sets HttpOnly session cookie
POST /auth/login           {email, password} -> sets HttpOnly session cookie
POST /auth/logout          clears the session cookie
GET  /auth/me               current user, or 401

GET    /scans               logged-in user's scan history
DELETE /scans/{id}          delete one scan
DELETE /scans                clear all history
POST   /scans/{id}/save     save a scan
DELETE /scans/{id}/save     un-save a scan

GET  /stats                 logged-in user's aggregate scan statistics
GET  /model                 real evaluation + benchmark metrics from ml/
```

Every route above (except `/health`) requires the gateway's `x-api-key`
header. The account-scoped routes additionally require a valid session
cookie, set by `/auth/login` or `/auth/register`.

## Privacy

Scan history for logged-in users stores only the **classification**, **spam
probability**, a **SHA-256 hash** of the message, and a timestamp — never the
message text itself. Anonymous/demo users get local, browser-only history
(`localStorage`), clearly labeled as such and never sent to the backend.

## What this demonstrates

- Turning raw text into numeric features with TF-IDF
- Training and evaluating a classification model (accuracy, precision,
  recall, F1, confusion matrix — not just accuracy, since the classes are
  imbalanced: ~87% ham vs ~13% spam)
- Comparing model choices (Naive Bayes vs Logistic Regression) on the same
  test set before picking one, with results generated by the scripts
  themselves (`ml/evaluation.json`, `ml/model_comparison.json`)
- Serializing and serving a trained model behind a REST API
- Fronting an internal service with an API gateway (Ballerina) that owns
  auth, request validation, cookie relay, and error normalization
- Stateless session auth (JWT in an HttpOnly cookie) backed by a small,
  deliberately minimal PostgreSQL schema (4 tables, no ORM, hand-rolled
  SQL migrations)
- Privacy-conscious persistence: hashing rather than storing message text
- Connecting a trained ML model to a real, polished, accessible, responsive
  user-facing frontend with dark/light/system theming
