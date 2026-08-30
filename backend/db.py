"""PostgreSQL connection pool for application persistence.

This is used for users/scans/stats — never for the ML model itself. The
inference path (TF-IDF + Naive Bayes) reads only the joblib artifacts.
"""

import os

from psycopg_pool import ConnectionPool

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://sms_classifier_app@127.0.0.1:5432/sms_classifier",
)

pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=5, open=False)


def db_is_healthy() -> bool:
    try:
        with pool.connection(timeout=2) as conn:
            conn.execute("SELECT 1")
        return True
    except Exception:
        return False
