"""Test fixtures.

Runs against the project's real local Postgres (DATABASE_URL from .env) —
no mocking, matching the project's existing "no ORM, real SQL" ethos. This
machine's Postgres role (sms_classifier_app) doesn't have CREATEDB, so
there's no separate _test database; instead every throwaway user this suite
creates uses a unique @example.test email and is deleted (cascading to its
messages/predictions/feedback via ON DELETE CASCADE) in fixture teardown,
so the suite never touches pre-existing data and leaves nothing behind.

Import order matters here: `main` must be imported before `db` so that
main.py's `load_dotenv()` call runs before db.py reads DATABASE_URL from
the environment at module-import time — importing `db` first would freeze
its DATABASE_URL at the (unauthenticated) default before .env is loaded.

The db.pool ConnectionPool is single-use (psycopg_pool raises PoolClosed if
reopened), so it's opened once for the whole test session here rather than
via the app's lifespan (which is designed for one open/close per process,
not per TestClient). TestClient instances are created without entering
their `with` context, so per-test requests never re-trigger lifespan.
"""

import sys
import uuid
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import main  # noqa: E402  (runs load_dotenv() before db is imported below)
import db  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _db_pool():
    db.pool.open()
    yield
    db.pool.close()


@pytest.fixture()
def client():
    return TestClient(main.app)


@pytest.fixture()
def user_email():
    return f"pytest-{uuid.uuid4().hex[:12]}@example.test"


@pytest.fixture()
def auth_client(client, user_email):
    """A TestClient already registered + logged in as a fresh throwaway
    user. Deletes that user (and everything cascaded from it) afterward."""
    resp = client.post("/auth/register", json={"email": user_email, "password": "testpass123"})
    assert resp.status_code == 201, resp.text
    yield client
    with db.pool.connection() as conn:
        conn.execute("DELETE FROM users WHERE email = %s", (user_email,))
