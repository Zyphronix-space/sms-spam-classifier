"""GET /dashboard — live aggregate stats + recent activity for the logged-in
user's own messages, computed straight from PostgreSQL (never fabricated).
Distinct from GET /model (routers/model.py), which reports training/test
metrics from ml/evaluation.json — this endpoint is about *live predictions*,
that one is about the model itself. Keeping them separate is deliberate: the
frontend must never conflate "how good the model tested" with "what this
user has actually been sending it"."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import auth
import db

router = APIRouter(tags=["dashboard"])


class RecentPrediction(BaseModel):
    id: str
    message: str
    classification: str
    spam_probability: float
    created_at: str


class DayCount(BaseModel):
    date: str
    spam: int
    ham: int


class DashboardOut(BaseModel):
    total_messages: int
    spam_count: int
    ham_count: int
    spam_percentage: float
    recent_predictions: list[RecentPrediction]
    predictions_over_time: list[DayCount]


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(user: dict = Depends(auth.get_current_user_required)):
    try:
        with db.pool.connection() as conn:
            totals = conn.execute(
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
                WHERE m.user_id = %s
                """,
                (user["sub"],),
            ).fetchone()

            recent = conn.execute(
                """
                SELECT m.id, m.body, p.classification, p.spam_probability, p.created_at
                FROM messages m
                JOIN LATERAL (
                    SELECT classification, spam_probability, created_at FROM predictions
                    WHERE message_id = m.id ORDER BY created_at DESC LIMIT 1
                ) p ON true
                WHERE m.user_id = %s
                ORDER BY p.created_at DESC
                LIMIT 10
                """,
                (user["sub"],),
            ).fetchall()

            since = date.today() - timedelta(days=29)
            by_day = conn.execute(
                """
                SELECT p.created_at::date AS day,
                       COUNT(*) FILTER (WHERE p.classification = 'spam') AS spam,
                       COUNT(*) FILTER (WHERE p.classification = 'ham') AS ham
                FROM predictions p
                JOIN messages m ON m.id = p.message_id
                WHERE m.user_id = %s AND p.created_at::date >= %s
                GROUP BY day
                ORDER BY day ASC
                """,
                (user["sub"], since),
            ).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load dashboard")

    total, spam, ham = totals
    spam_percentage = round((spam / total * 100), 2) if total else 0.0

    by_day_map = {r[0].isoformat(): (r[1], r[2]) for r in by_day}
    predictions_over_time = []
    for offset in range(29, -1, -1):
        d = (date.today() - timedelta(days=offset)).isoformat()
        s, h = by_day_map.get(d, (0, 0))
        predictions_over_time.append(DayCount(date=d, spam=s, ham=h))

    return DashboardOut(
        total_messages=total,
        spam_count=spam,
        ham_count=ham,
        spam_percentage=spam_percentage,
        recent_predictions=[
            RecentPrediction(
                id=str(r[0]), message=r[1], classification=r[2], spam_probability=r[3], created_at=r[4].isoformat()
            )
            for r in recent
        ],
        predictions_over_time=predictions_over_time,
    )
