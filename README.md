# SMS Spam Detection Platform

A full-stack machine learning platform that classifies text messages as spam or
ham (not spam), trained on the classic
[SMS Spam Collection dataset](https://archive.ics.uci.edu/dataset/228/sms+spam+collection)
(5,572 labeled real SMS messages). What started as a single-agent classifier
demo has grown into a complete product: authenticated accounts, a persisted,
searchable message history, a feedback loop for correcting the model's calls,
CSV batch scanning, and a live analytics dashboard — all built around the
same TF-IDF + Multinomial Naive Bayes model the project started with. The
frontend is an original, minimalist/technical "security scanner" UI —
monochrome, dot-grid, restrained red accents — not a copy of any vendor's
design.

**Live demo:** ask it to classify a message with no account at all — the
model, TF-IDF vectorizer, and Ballerina/FastAPI pipeline all work fully
anonymously. Register an account to unlock saved history, feedback, batch
CSV scanning, and the dashboard.

```
frontend (React, sidebar layout)  ->  gateway (Ballerina, :9000)  ->  backend (FastAPI, :8000)
                                                                            |
                                                          +-----------------+-----------------+
                                                          v                                   v
                                                 ml/ (joblib model)                     PostgreSQL
                                                                              (users, messages, predictions,
                                                                               feedback, model_versions)
```

## What's here

- **`ml/`** — trains and evaluates the model. Unchanged by this platform
  upgrade — every existing script, and its outputs, are exactly what they
  were before.
  - `train_model.py` converts messages to TF-IDF features and trains a
    Multinomial Naive Bayes classifier (80/20 train/test split), saves it
    with `joblib`, and writes `evaluation.json` (accuracy/precision/recall/F1,
    confusion matrix, dataset counts).
  - `compare_models.py` benchmarks Naive Bayes against Logistic Regression on
    the same data and writes `model_comparison.json`.
  - `predict.py` loads the saved model and classifies a few example messages.
- **`backend/`** — a FastAPI service.
  - `classify.py` — the one place that loads the model/vectorizer and calls
    `predict`/`predict_proba`. Both `POST /predict` (stateless) and
    `POST /messages` (persisted) call through it, so there's exactly one
    inference code path.
  - `auth.py` / `routers/auth_routes.py` — registration, login, logout,
    bcrypt password hashing, and a stateless JWT held in an HttpOnly session
    cookie (`get_current_user_required`/`get_current_admin` FastAPI
    dependencies gate every account-scoped route).
  - `routers/messages.py`, `routers/feedback.py`, `routers/batch.py`,
    `routers/dashboard.py` — the platform's new surface (see API below).
  - `routers/model.py` — unchanged: real evaluation/benchmark metrics read
    straight from `ml/evaluation.json` and `ml/model_comparison.json`.
  - `routers/admin.py` — system-wide stats, user list/delete, recent
    messages across all accounts, for admin accounts only.
  - `db.py` / `migrate.py` / `migrations/*.sql` — a small hand-rolled
    Postgres schema, no ORM, applied by a tiny migration runner.
- **`gateway/`** — a [Ballerina](https://ballerina.io) API gateway sitting in
  front of the backend. It checks an API key, validates request shapes,
  relays the session cookie both directions (including through multipart
  CSV uploads and a binary CSV export), forwards to the FastAPI service, and
  normalizes errors — the same role WSO2 API Manager / Micro Integrator play
  in production between clients and backend services.
- **`frontend/`** — a React (Vite) app with a sidebar layout: Dashboard,
  Classifier, Message History, Batch Scan, Analytics, Feedback (+ Admin for
  admins). Talks to the gateway, never the backend directly.

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

## Database schema

Four original tables (`users`, `model_versions`, `scans`, `saved_scans`) plus
three added for this platform (`messages`, `predictions`, `feedback`) —
see `backend/migrations/*.sql` for the authoritative DDL.

```
users
 ├── id (uuid, pk)
 ├── email (unique)
 ├── password_hash (bcrypt)
 └── is_admin

messages                              (belongs to a user)
 ├── id (uuid, pk)
 ├── user_id -> users.id
 ├── body (the SMS text — plaintext, see Privacy below)
 ├── source ('manual' | 'batch'), batch_id
 └── created_at, updated_at

predictions                           (belongs to a message; a message can
 ├── id (uuid, pk)                     have several, one per edit/reclassify)
 ├── message_id -> messages.id
 ├── model_version_id -> model_versions.id
 ├── classification ('spam' | 'ham')
 ├── spam_probability
 └── created_at

feedback                              (belongs to a prediction + the user
 ├── id (uuid, pk)                     who gave it; one per pair)
 ├── prediction_id -> predictions.id
 ├── user_id -> users.id
 ├── is_correct
 ├── actual_classification (required when is_correct = false)
 └── created_at

model_versions                        (one row per trained model, written
 └── ...                               from ml/evaluation.json at startup)
```

`scans`/`saved_scans` (the original hash-only scan history) are **left in
the database, untouched, but no longer written to or read from** — see
Privacy below for why they were superseded rather than migrated.

## API

```
GET  /health                          gateway + backend + database status

POST /predict                         {message} -> {label, spam_probability}
                                       Stateless — classifies only, persists
                                       nothing. Used by anonymous visitors
                                       (whose history stays in localStorage)
                                       and as the one shared inference path.

POST /auth/register                   {email, password} -> sets session cookie
POST /auth/login                      {email, password} -> sets session cookie
POST /auth/logout                     clears the session cookie
GET  /auth/me                         current user, or 401

POST   /messages                      {message} -> classify + save (message
                                       text + a predictions row)
GET    /messages                      ?q=&classification=&sort=&limit=&offset=
GET    /messages/{id}                 message + full prediction history + feedback
PUT    /messages/{id}                 {message} -> update text, re-classify
                                       (appends a new prediction row)
DELETE /messages/{id}                 delete (cascades predictions + feedback)

POST /messages/{id}/feedback          {is_correct, actual_classification?}
GET  /messages/{id}/feedback          existing feedback for this message, or null
GET  /feedback                        the user's feedback history

POST /batch                           multipart CSV upload -> validate,
                                       classify, save, and return per-row
                                       results + summary counts/percentage
GET  /batch/{batch_id}/export         download that batch's results as CSV

GET  /dashboard                       live totals, spam %, recent
                                       predictions, 30-day time series

GET  /model                           real evaluation + benchmark metrics
                                       from ml/ (training/test — distinct
                                       from /dashboard's live numbers)

GET    /admin/stats                   system-wide totals (admin only)
GET    /admin/users                   all users + message counts (admin only)
DELETE /admin/users/{id}              delete a user (admin only)
GET    /admin/messages                recent messages, all users (admin only)
```

Every route above (except `/health`) requires the gateway's `x-api-key`
header. The account-scoped routes additionally require a valid session
cookie, set by `/auth/login` or `/auth/register`.

## Privacy

**This changed from the project's earlier design, deliberately.** The
original version stored only a SHA-256 hash of each scanned message —
message text was never persisted. That design can't support message CRUD,
search, edit-and-reclassify, per-message feedback, or CSV batch results with
visible content, all of which this platform adds. The tradeoff was made
explicitly:

- **Logged-in users**: message text is now stored in plaintext in
  `messages.body`, scoped to that account, deletable at any time, never
  shared across accounts (every query filters by `user_id`).
- **Anonymous/demo users**: unchanged — history stays in the browser's
  `localStorage` only, clearly labeled as such, and is never sent to the
  backend for storage (only for a one-off, unsaved classification via
  `/predict`).

The original `scans`/`saved_scans` tables (hash-only) are left in the
database untouched, but the app no longer reads or writes them — there was
nothing meaningful to carry forward into `messages` (a hash can't be turned
back into text), so they're frozen history rather than migrated data.

## Security

- Every account-scoped route requires a valid session; every query is
  additionally scoped to `user_id = <current user>` — another account's
  message id 404s rather than 403ing, so its existence isn't leaked either
  way.
- CSV uploads are parsed entirely in memory (`pandas.read_csv` over the
  uploaded bytes) and never written to disk — no path-traversal surface, no
  temp-file cleanup needed. Capped at 1MB / 500 rows.
- CSV exports sanitize any field starting with `= + - @` (a leading quote
  prefix) to prevent formula injection if the file is opened in a
  spreadsheet.
- All SQL is parameterized (no string-built queries) — no ORM, hand-rolled
  SQL throughout, same as the project's original backend.
- `.env` (`DATABASE_URL`, `JWT_SECRET`) is gitignored and required — no
  secrets committed, no hardcoded fallback secret used in production.
- Passwords are bcrypt-hashed; sessions are a signed, expiring JWT in an
  HttpOnly cookie (never exposed to JS, never returned in a response body).
- **Not implemented, and out of scope for this pass**: rate limiting, email
  verification, password reset. Noted as remaining work, not silently
  skipped.

## Testing

```
cd backend
pytest
```

41 tests across `backend/tests/`, run against a real local Postgres — no
mocking, matching the project's "real SQL, no ORM" ethos. This machine's
Postgres role doesn't have `CREATEDB`, so there's no separate `_test`
database; every test creates throwaway users under unique `@example.test`
emails and deletes them (cascading to their messages/predictions/feedback)
in fixture teardown, so the suite never touches real data and leaves
nothing behind. If your setup *does* have `CREATEDB`, pointing
`DATABASE_URL` at a dedicated test database before running `pytest` works
identically.

- `test_health.py` — health endpoint shape.
- `test_auth.py` — register/duplicate-email/invalid-email/login
  success+failure/logout/`me`.
- `test_classify.py` — spam and ham examples classify correctly; the
  returned probability is cross-checked directly against
  `model.predict_proba` to prove it isn't fabricated; empty input rejected.
- `test_messages.py` — full CRUD, ownership scoping (cross-user access
  404s), search/filter/sort, edit-appends-a-new-prediction-row behavior.
- `test_feedback.py` — correct/incorrect feedback, missing
  `actual_classification` rejected, duplicate submission conflicts,
  cross-user access denied.
- `test_batch.py` — CSV counts match content, invalid rows reported not
  silently dropped, oversized/wrong-type files rejected, export round-trips
  the right rows.

CI (`.github/workflows/`) predates this platform upgrade and wasn't updated
in this pass — see Known limitations.

## Model performance

From `ml/evaluation.json` (real, not hardcoded — see `/model` and the
Analytics page):

| Metric | Value |
|---|---|
| Accuracy | 97.04% |
| Precision (spam) | 100% |
| Recall (spam) | 77.85% |
| F1 (spam) | 87.55% |

F1 matters here, not just accuracy, because the dataset is imbalanced
(~87% ham / ~13% spam) — a model can score high accuracy while still
missing most spam.

## What this demonstrates

- Turning raw text into numeric features with TF-IDF, training and
  evaluating a classifier with real, non-fabricated metrics (accuracy,
  precision, recall, F1, confusion matrix), and comparing model choices
  before picking one.
- Serializing and serving a trained model behind a REST API, fronted by an
  API gateway (Ballerina) that owns auth, request validation, cookie relay,
  and error normalization — including multipart and binary passthrough.
- A relational schema with real foreign-key relationships (`User` →
  `Message` → `Prediction` → `Feedback`) modeling a full product loop:
  classify, persist, search, correct, batch-process, visualize.
- Stateless session auth (JWT in an HttpOnly cookie) with bcrypt password
  hashing and per-request ownership checks, backed by hand-rolled SQL
  migrations — no ORM.
- A closed feedback loop: users can flag a wrong prediction and record what
  it should have been, stored for future analysis (**not** auto-applied
  back into the production model — retraining from feedback would need a
  reviewed, versioned pipeline, which is explicitly out of scope here).
- A CSV batch pipeline: validate → classify → persist → summarize → export,
  all reusing the same inference path as the single-message flow.
- An honest privacy tradeoff, explained rather than hidden: moving from
  hash-only to plaintext storage was necessary for the features this
  platform adds, and is scoped to logged-in accounts only.
- Connecting all of the above to a real, polished, accessible, responsive,
  sidebar-navigated frontend with dark/light/system theming, toasts,
  confirmation dialogs, and loading/empty/error states throughout.

## Interview prep

**Why hand-rolled orchestration instead of an ORM?** The schema is small
(seven tables) and every query is already known ahead of time — parameterized
raw SQL is fewer moving parts than an ORM's abstraction for this scope, and
keeps exactly what's sent to Postgres visible in the router that sends it.

**Why does editing a message insert a new prediction row instead of updating
the old one?** So a message's classification history survives edits —
`GET /messages/{id}` returns every prediction it's ever had, newest first.
This also means feedback always targets a specific prediction (the one that
was current when the feedback was given), not a message in the abstract.

**Why is CSV parsed with pandas instead of Python's csv module?** `pandas` was
already a project dependency (used by `ml/train_model.py`); reusing it avoids
hand-rolling quoting/dialect-detection edge cases for a task the library
already solves well, and its `DataFrame` makes column-name detection
(`message`/`text`/`sms`/first-column fallback) a one-liner.

**What stops a wrong prediction from silently correcting itself?** Nothing
does — on purpose. `POST /messages/{id}/feedback` only ever writes to the
`feedback` table; nothing reads from it to change `classify.py`'s behavior.
Auto-retraining from unreviewed user feedback is a data-quality risk (a bad
actor, or just noisy disagreement, could poison the model) — the honest
answer is that a safe retraining pipeline needs curation and evaluation
before any feedback-derived data touches the production model, which this
project doesn't build.

**Why does `/predict` still exist alongside `/messages`?** Two different
jobs. `/predict` is the original, stateless, no-account-required
classify-only endpoint — anonymous visitors and any future integration that
just wants a label/probability pair use it. `/messages` classifies **and**
persists, which requires an account. Both call through the same
`classify.py` function, so there's one inference path either way — see
`test_classify.py::test_predict_probability_is_not_fabricated` for the
proof.

## Known limitations

- **No rate limiting, email verification, or password reset.** Explicitly
  out of scope for this pass — noted rather than silently skipped.
- **Search is a plain `ILIKE` scan**, not a full-text index (no `pg_trgm` or
  similar). Fine at this project's scale; would need revisiting at real
  volume.
- **No token-level streaming, and CI wasn't updated** for the new test suite
  in this pass — `.github/workflows/` still reflects the project's earlier
  shape.
- **UI was verified via `npm run build` and manual API-level testing through
  the full gateway → backend → Postgres chain, not an interactive browser
  session** — no browser automation tool was available in this environment
  for this pass. Every new endpoint was exercised end-to-end via HTTP
  (including through the Ballerina gateway, multipart CSV upload, and binary
  CSV export) and the pytest suite covers the backend directly, but a
  from-the-browser click-through pass is still worth doing before treating
  the frontend as fully verified.
