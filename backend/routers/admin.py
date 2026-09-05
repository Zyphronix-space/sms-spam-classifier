"""GET/DELETE /admin/* — system-wide views for admin accounts only.

Every route here depends on auth.get_current_admin, which re-checks the
is_admin flag in the database on every request (not baked into the JWT),
so revoking admin access takes effect immediately.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import auth
import db

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminStatsOut(BaseModel):
    total_users: int
    total_messages: int
    spam: int
    ham: int
    spam_rate: float


class AdminUserOut(BaseModel):
    id: str
    email: str
    is_admin: bool
    created_at: str
    message_count: int


class AdminScanOut(BaseModel):
    id: str
    user_email: str
    classification: str
    spam_probability: float
    created_at: str


@router.get("/stats", response_model=AdminStatsOut)
def admin_stats(_: dict = Depends(auth.get_current_admin)):
    try:
        with db.pool.connection() as conn:
            total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            row = conn.execute(
                """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE p.classification = 'spam') AS spam,
                    COUNT(*) FILTER (WHERE p.classification = 'ham') AS ham
                FROM messages m
                JOIN LATERAL (
                    SELECT classification FROM predictions
                    WHERE message_id = m.id ORDER BY created_at DESC LIMIT 1
                ) p ON true
                """
            ).fetchone()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load system statistics")

    total, spam, ham = row
    spam_rate = (spam / total * 100) if total else 0.0
    return AdminStatsOut(
        total_users=total_users,
        total_messages=total,
        spam=spam,
        ham=ham,
        spam_rate=round(spam_rate, 2),
    )


@router.get("/users", response_model=list[AdminUserOut])
def admin_list_users(_: dict = Depends(auth.get_current_admin)):
    try:
        with db.pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT u.id, u.email, u.is_admin, u.created_at, COUNT(m.id) AS message_count
                FROM users u
                LEFT JOIN messages m ON m.user_id = u.id
                GROUP BY u.id
                ORDER BY u.created_at DESC
                """
            ).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load users")

    return [
        AdminUserOut(
            id=str(r[0]), email=r[1], is_admin=r[2], created_at=r[3].isoformat(), message_count=r[4]
        )
        for r in rows
    ]


@router.delete("/users/{user_id}")
def admin_delete_user(user_id: str, admin: dict = Depends(auth.get_current_admin)):
    try:
        uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid user id")
    if user_id == admin["sub"]:
        raise HTTPException(status_code=400, detail="cannot delete your own account from the admin panel")

    try:
        with db.pool.connection() as conn:
            result = conn.execute("DELETE FROM users WHERE id = %s", (user_id,))
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="user not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not delete user")
    return {"message": "deleted"}


@router.get("/messages", response_model=list[AdminScanOut])
def admin_recent_messages(_: dict = Depends(auth.get_current_admin)):
    try:
        with db.pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT m.id, u.email, p.classification, p.spam_probability, p.created_at
                FROM messages m
                JOIN users u ON u.id = m.user_id
                JOIN LATERAL (
                    SELECT classification, spam_probability, created_at FROM predictions
                    WHERE message_id = m.id ORDER BY created_at DESC LIMIT 1
                ) p ON true
                ORDER BY p.created_at DESC
                LIMIT 100
                """
            ).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load messages")

    return [
        AdminScanOut(
            id=str(r[0]), user_email=r[1], classification=r[2], spam_probability=r[3], created_at=r[4].isoformat()
        )
        for r in rows
    ]
