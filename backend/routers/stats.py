"""GET /stats — aggregate scan statistics for the logged-in user, computed
live from PostgreSQL. Distinct from the frontend's localStorage-only stats
shown to anonymous/demo users."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import auth
import db

router = APIRouter(tags=["stats"])


class StatsOut(BaseModel):
    total_scans: int
    spam: int
    ham: int
    spam_rate: float
    avg_spam_score: float


@router.get("/stats", response_model=StatsOut)
def get_stats(user: dict = Depends(auth.get_current_user_required)):
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE classification = 'spam') AS spam,
                    COUNT(*) FILTER (WHERE classification = 'ham') AS ham,
                    COALESCE(AVG(spam_probability), 0) AS avg_score
                FROM scans
                WHERE user_id = %s
                """,
                (user["sub"],),
            ).fetchone()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load statistics")

    total, spam, ham, avg_score = row
    spam_rate = (spam / total * 100) if total else 0.0
    return StatsOut(
        total_scans=total,
        spam=spam,
        ham=ham,
        spam_rate=round(spam_rate, 2),
        avg_spam_score=round(float(avg_score) * 100, 2),
    )
