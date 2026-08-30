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
    total_scans: int
    spam: int
    ham: int
    spam_rate: float


class AdminUserOut(BaseModel):
    id: str
    email: str
    is_admin: bool
    created_at: str
    scan_count: int


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
                    COUNT(*) FILTER (WHERE classification = 'spam') AS spam,
                    COUNT(*) FILTER (WHERE classification = 'ham') AS ham
                FROM scans
                """
            ).fetchone()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load system statistics")

    total, spam, ham = row
    spam_rate = (spam / total * 100) if total else 0.0
    return AdminStatsOut(
        total_users=total_users,
        total_scans=total,
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
                SELECT u.id, u.email, u.is_admin, u.created_at, COUNT(s.id) AS scan_count
                FROM users u
                LEFT JOIN scans s ON s.user_id = u.id
                GROUP BY u.id
                ORDER BY u.created_at DESC
                """
            ).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load users")

    return [
        AdminUserOut(
            id=str(r[0]), email=r[1], is_admin=r[2], created_at=r[3].isoformat(), scan_count=r[4]
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


@router.get("/scans", response_model=list[AdminScanOut])
def admin_recent_scans(_: dict = Depends(auth.get_current_admin)):
    try:
        with db.pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT s.id, u.email, s.classification, s.spam_probability, s.created_at
                FROM scans s
                JOIN users u ON u.id = s.user_id
                ORDER BY s.created_at DESC
                LIMIT 100
                """
            ).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load scans")

    return [
        AdminScanOut(
            id=str(r[0]), user_email=r[1], classification=r[2], spam_probability=r[3], created_at=r[4].isoformat()
        )
        for r in rows
    ]
