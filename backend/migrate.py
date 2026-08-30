"""Tiny migration runner: applies numbered SQL files from migrations/ that
haven't been applied yet, tracking progress in a schema_migrations table.

Run with:
    python migrate.py
"""

import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://sms_classifier_app@127.0.0.1:5432/sms_classifier",
)
MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def main():
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    with psycopg.connect(DATABASE_URL, autocommit=False) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        applied = {row[0] for row in conn.execute("SELECT filename FROM schema_migrations").fetchall()}
        for path in files:
            if path.name in applied:
                print(f"skip  {path.name} (already applied)")
                continue
            print(f"apply {path.name}")
            conn.execute(path.read_text())
            conn.execute("INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,))
        conn.commit()
    print("migrations up to date")


if __name__ == "__main__":
    main()
