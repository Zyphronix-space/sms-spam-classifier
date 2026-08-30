"""Password hashing and stateless session cookies.

There is no server-side sessions table: the JWT inside the HttpOnly cookie
*is* the session. This matches the project's four-table schema (users,
scans, saved_scans, model_versions) — adding a sessions table just to track
logins would be unnecessary state for what a signed, expiring token already
gives us.
"""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Cookie, HTTPException, status

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
