"""POST /auth/register, /auth/login, /auth/logout — issue or clear the
HttpOnly session cookie. Never returns the password hash or the JWT itself
in a response body."""

import re

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

import auth
import db

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterInput, response: Response):
    email = payload.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="invalid email address")

    password_hash = auth.hash_password(payload.password)
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id, email, is_admin",
                (email, password_hash),
            ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="an account with this email already exists")
    except Exception:
        raise HTTPException(status_code=500, detail="could not create account")

    user_id, user_email, is_admin = row
    _set_session_cookie(response, str(user_id), user_email)
    return UserOut(id=str(user_id), email=user_email, is_admin=is_admin)


@router.post("/login", response_model=UserOut)
def login(payload: LoginInput, response: Response):
    email = payload.email.strip().lower()
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                "SELECT id, email, password_hash, is_admin FROM users WHERE email = %s",
                (email,),
            ).fetchone()
    except Exception:
        raise HTTPException(status_code=500, detail="login failed")

    if row is None or not auth.verify_password(payload.password, row[2]):
        raise HTTPException(status_code=401, detail="invalid email or password")

    user_id, user_email, _, is_admin = row
    _set_session_cookie(response, str(user_id), user_email)
    return UserOut(id=str(user_id), email=user_email, is_admin=is_admin)


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
            row = conn.execute("SELECT is_admin FROM users WHERE id = %s", (user["sub"],)).fetchone()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load account")
    is_admin = bool(row[0]) if row else False
    return UserOut(id=user["sub"], email=user["email"], is_admin=is_admin)
