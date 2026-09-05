"""Password hashing and stateless session cookies.

There is no server-side sessions table: the JWT inside the HttpOnly cookie
*is* the session. This matches the project's four-table schema (users,
scans, saved_scans, model_versions) — adding a sessions table just to track
logins would be unnecessary state for what a signed, expiring token already
gives us.
"""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Cookie, Depends, HTTPException, status

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
TOKEN_TTL = timedelta(days=7)
COOKIE_NAME = "sms_session"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
# "lax" for local dev (frontend/gateway share the "localhost" site across
# ports). In production the frontend (Static Web Apps) and gateway
# (Container Apps) are on different domains, so this must be "none" —
# which requires COOKIE_SECURE=true, since browsers reject SameSite=None
# cookies that aren't Secure.
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_session_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "email": email, "iat": now, "exp": now + TOKEN_TTL}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def get_current_user_optional(sms_session: str | None = Cookie(default=None)) -> dict | None:
    if not sms_session:
        return None
    return decode_session_token(sms_session)


def get_current_user_required(sms_session: str | None = Cookie(default=None)) -> dict:
    user = get_current_user_optional(sms_session)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required")
    return user


RESET_TOKEN_TTL = timedelta(minutes=30)


def generate_reset_token() -> str:
    """A URL-safe random token handed to the caller exactly once. Only its
    hash (below) is ever persisted."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """SHA-256 is fine here (unlike passwords, this token is already
    high-entropy random data, not something a dictionary attack could
    guess) -- same idea as GitHub/Django's reset-token storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_admin(user: dict = Depends(get_current_user_required)) -> dict:
    """Checked fresh against the database on every call — the JWT itself
    carries no role claim, so a revoked admin flag takes effect immediately
    instead of only after the token expires."""
    import db  # local import: avoids a module-load-time cycle with db.py

    with db.pool.connection() as conn:
        row = conn.execute("SELECT is_admin FROM users WHERE id = %s", (user["sub"],)).fetchone()
    if row is None or not row[0]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin access required")
    return user
