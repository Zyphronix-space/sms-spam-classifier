"""GET/DELETE /scans, POST/DELETE /scans/{id}/save — a logged-in user's
persisted scan history. Every route requires a valid session cookie."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import auth
import db

router = APIRouter(tags=["scans"])


class ScanOut(BaseModel):
    id: str
    classification: str
    spam_probability: float
    created_at: str
    saved: bool


def _validate_scan_id(scan_id: str) -> None:
    try:
        uuid.UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid scan id")


@router.get("/scans", response_model=list[ScanOut])
def list_scans(user: dict = Depends(auth.get_current_user_required)):
    try:
        with db.pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT s.id, s.classification, s.spam_probability, s.created_at,
                       (sv.id IS NOT NULL) AS saved
                FROM scans s
                LEFT JOIN saved_scans sv ON sv.scan_id = s.id AND sv.user_id = s.user_id
                WHERE s.user_id = %s
                ORDER BY s.created_at DESC
                LIMIT 100
                """,
                (user["sub"],),
            ).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load scan history")

    return [
        ScanOut(
            id=str(r[0]),
            classification=r[1],
            spam_probability=r[2],
            created_at=r[3].isoformat(),
            saved=r[4],
        )
        for r in rows
    ]


@router.delete("/scans/{scan_id}")
def delete_scan(scan_id: str, user: dict = Depends(auth.get_current_user_required)):
    _validate_scan_id(scan_id)
    try:
        with db.pool.connection() as conn:
            result = conn.execute(
                "DELETE FROM scans WHERE id = %s AND user_id = %s",
                (scan_id, user["sub"]),
            )
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="scan not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not delete scan")
    return {"message": "deleted"}


@router.delete("/scans")
def clear_scans(user: dict = Depends(auth.get_current_user_required)):
    try:
        with db.pool.connection() as conn:
            conn.execute("DELETE FROM scans WHERE user_id = %s", (user["sub"],))
    except Exception:
        raise HTTPException(status_code=500, detail="could not clear history")
    return {"message": "history cleared"}


@router.post("/scans/{scan_id}/save")
def save_scan(scan_id: str, user: dict = Depends(auth.get_current_user_required)):
    _validate_scan_id(scan_id)
    try:
        with db.pool.connection() as conn:
            owned = conn.execute(
                "SELECT id FROM scans WHERE id = %s AND user_id = %s", (scan_id, user["sub"])
            ).fetchone()
            if owned is None:
                raise HTTPException(status_code=404, detail="scan not found")
            conn.execute(
                """
                INSERT INTO saved_scans (user_id, scan_id) VALUES (%s, %s)
                ON CONFLICT (user_id, scan_id) DO NOTHING
                """,
                (user["sub"], scan_id),
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not save scan")
    return {"message": "saved"}


@router.delete("/scans/{scan_id}/save")
def unsave_scan(scan_id: str, user: dict = Depends(auth.get_current_user_required)):
    _validate_scan_id(scan_id)
    try:
        with db.pool.connection() as conn:
            conn.execute(
                "DELETE FROM saved_scans WHERE user_id = %s AND scan_id = %s",
                (user["sub"], scan_id),
            )
    except Exception:
        raise HTTPException(status_code=500, detail="could not unsave scan")
    return {"message": "unsaved"}
