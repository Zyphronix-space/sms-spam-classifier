"""POST /auth/register, /auth/login, /auth/logout — issue or clear the
HttpOnly session cookie. Never returns the password hash or the JWT itself
in a response body.

Also: forgot/reset password (token-based, no email provider configured —
see README), change-password, and delete-own-account."""

import os
import re
from datetime import datetime, timezone

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

import auth
import db
from ratelimit import rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


class RegisterInput(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)


class LoginInput(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    is_admin: bool = False
    created_at: str


def _set_session_cookie(response: Response, user_id: str, email: str) -> None:
    token = auth.create_session_token(user_id, email)
    response.set_cookie(
        key=auth.COOKIE_NAME,
        value=token,
        httponly=True,
        samesite=auth.COOKIE_SAMESITE,
        secure=auth.COOKIE_SECURE,
        max_age=int(auth.TOKEN_TTL.total_seconds()),
        path="/",
    )


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register", max_requests=10, window_seconds=60))],
)
def register(payload: RegisterInput, response: Response):
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="invalid email address")

    password_hash = auth.hash_password(payload.password)
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id, email, is_admin, created_at",
                (email, password_hash),
            ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="an account with this email already exists")
    except Exception:
        raise HTTPException(status_code=500, detail="could not create account")

    user_id, user_email, is_admin, created_at = row
    _set_session_cookie(response, str(user_id), user_email)
    return UserOut(id=str(user_id), email=user_email, is_admin=is_admin, created_at=created_at.isoformat())


@router.post(
    "/login",
    response_model=UserOut,
    dependencies=[Depends(rate_limit("login", max_requests=10, window_seconds=60))],
)
def login(payload: LoginInput, response: Response):
    email = payload.email.strip().lower()
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                "SELECT id, email, password_hash, is_admin, created_at FROM users WHERE email = %s",
                (email,),
            ).fetchone()
    except Exception:
        raise HTTPException(status_code=500, detail="login failed")

    if row is None or not auth.verify_password(payload.password, row[2]):
        raise HTTPException(status_code=401, detail="invalid email or password")

    user_id, user_email, _, is_admin, created_at = row
    _set_session_cookie(response, str(user_id), user_email)
    return UserOut(id=str(user_id), email=user_email, is_admin=is_admin, created_at=created_at.isoformat())


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key=auth.COOKIE_NAME,
        path="/",
        samesite=auth.COOKIE_SAMESITE,
        secure=auth.COOKIE_SECURE,
    )
    return {"message": "logged out"}


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(auth.get_current_user_required)):
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                "SELECT is_admin, created_at FROM users WHERE id = %s", (user["sub"],)
            ).fetchone()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load account")
    if row is None:
        raise HTTPException(status_code=401, detail="account no longer exists")
    is_admin, created_at = row
    return UserOut(id=user["sub"], email=user["email"], is_admin=bool(is_admin), created_at=created_at.isoformat())


class ForgotPasswordInput(BaseModel):
    email: str


class ForgotPasswordOut(BaseModel):
    message: str
    demo_reset_link: str | None = None
    expires_in_minutes: int | None = None


class ResetPasswordInput(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordOut,
    dependencies=[Depends(rate_limit("forgot-password", max_requests=5, window_seconds=60))],
)
def forgot_password(payload: ForgotPasswordInput):
    """Always returns 200 with a generic message so the response itself
    doesn't reveal whether the email is registered. When it is, a reset
    link is generated -- but since this project has no mail provider
    configured (see README), that link is returned directly in the demo_reset_link
    field instead of being emailed. That is a deliberate, disclosed
    tradeoff for a demo deployment, not something a production system
    should do (a real deployment would email the link and never return it
    in the API response)."""
    email = payload.email.strip().lower()
    generic = ForgotPasswordOut(message="if that email is registered, a reset link has been generated")

    try:
        with db.pool.connection() as conn:
            row = conn.execute("SELECT id FROM users WHERE email = %s", (email,)).fetchone()
            if row is None:
                return generic

            token = auth.generate_reset_token()
            expires_at = datetime.now(timezone.utc) + auth.RESET_TOKEN_TTL
            conn.execute(
                """
                INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                VALUES (%s, %s, %s)
                """,
                (row[0], auth.hash_token(token), expires_at),
            )
    except Exception:
        raise HTTPException(status_code=500, detail="could not process request")

    return ForgotPasswordOut(
        message="a reset link has been generated",
        demo_reset_link=f"{FRONTEND_URL}/reset-password?token={token}",
        expires_in_minutes=int(auth.RESET_TOKEN_TTL.total_seconds() // 60),
    )


@router.post("/reset-password")
def reset_password(payload: ResetPasswordInput):
    token_hash = auth.hash_token(payload.token)
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                """
                SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
                WHERE token_hash = %s
                """,
                (token_hash,),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=400, detail="invalid or expired reset link")
            token_id, user_id, expires_at, used_at = row
            if used_at is not None:
                raise HTTPException(status_code=400, detail="this reset link has already been used")
            if expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="this reset link has expired")

            password_hash = auth.hash_password(payload.new_password)
            conn.execute("UPDATE users SET password_hash = %s, updated_at = now() WHERE id = %s", (password_hash, user_id))
            conn.execute("UPDATE password_reset_tokens SET used_at = now() WHERE id = %s", (token_id,))
            conn.execute(
                "DELETE FROM password_reset_tokens WHERE user_id = %s AND id != %s", (user_id, token_id)
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not reset password")

    return {"message": "password has been reset"}


@router.patch("/change-password")
def change_password(payload: ChangePasswordInput, user: dict = Depends(auth.get_current_user_required)):
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                "SELECT password_hash FROM users WHERE id = %s", (user["sub"],)
            ).fetchone()
            if row is None or not auth.verify_password(payload.current_password, row[0]):
                raise HTTPException(status_code=401, detail="current password is incorrect")
            password_hash = auth.hash_password(payload.new_password)
            conn.execute(
                "UPDATE users SET password_hash = %s, updated_at = now() WHERE id = %s",
                (password_hash, user["sub"]),
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not change password")

    return {"message": "password changed"}


@router.delete("/me")
def delete_account(response: Response, user: dict = Depends(auth.get_current_user_required)):
    try:
        with db.pool.connection() as conn:
            conn.execute("DELETE FROM users WHERE id = %s", (user["sub"],))
    except Exception:
        raise HTTPException(status_code=500, detail="could not delete account")

    response.delete_cookie(
        key=auth.COOKIE_NAME,
        path="/",
        samesite=auth.COOKIE_SAMESITE,
        secure=auth.COOKIE_SECURE,
    )
    return {"message": "account deleted"}
