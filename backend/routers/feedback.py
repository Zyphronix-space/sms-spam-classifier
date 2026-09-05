"""POST/GET /messages/{id}/feedback, GET /feedback — "was this prediction
correct?" targeting a message's *current* (latest) prediction. One feedback
row per (prediction, user) — a second submission for the same prediction is
rejected rather than silently overwritten, so a user can't quietly flip
their own answer without it being visible as a new event on a new
prediction (e.g. after editing the message)."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

import auth
import db
from validation import validate_uuid

router = APIRouter(tags=["feedback"])


class FeedbackInput(BaseModel):
    is_correct: bool
    actual_classification: str | None = None

    @field_validator("actual_classification")
    @classmethod
    def _valid_classification(cls, v):
        if v is not None and v not in ("spam", "ham"):
            raise ValueError("actual_classification must be 'spam' or 'ham'")
        return v


class FeedbackOut(BaseModel):
    id: str
    message_id: str
    is_correct: bool
    actual_classification: str | None
    created_at: str


def _latest_prediction_id(conn, message_id: str, user_id: str) -> str:
    row = conn.execute(
        """
        SELECT p.id
        FROM predictions p
        JOIN messages m ON m.id = p.message_id
        WHERE m.id = %s AND m.user_id = %s
        ORDER BY p.created_at DESC
        LIMIT 1
        """,
        (message_id, user_id),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="message not found")
    return str(row[0])


@router.post("/messages/{message_id}/feedback", response_model=FeedbackOut, status_code=201)
def submit_feedback(message_id: str, payload: FeedbackInput, user: dict = Depends(auth.get_current_user_required)):
    validate_uuid(message_id, "message id")
    if not payload.is_correct and payload.actual_classification is None:
        raise HTTPException(status_code=400, detail="actual_classification is required when is_correct is false")

    try:
        with db.pool.connection() as conn:
            prediction_id = _latest_prediction_id(conn, message_id, user["sub"])
            existing = conn.execute(
                "SELECT id FROM feedback WHERE prediction_id = %s AND user_id = %s",
                (prediction_id, user["sub"]),
            ).fetchone()
            if existing is not None:
                raise HTTPException(status_code=409, detail="feedback already submitted for this prediction")
            row = conn.execute(
                """
                INSERT INTO feedback (prediction_id, user_id, is_correct, actual_classification)
                VALUES (%s, %s, %s, %s)
                RETURNING id, created_at
                """,
                (prediction_id, user["sub"], payload.is_correct, payload.actual_classification),
            ).fetchone()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not save feedback")

    return FeedbackOut(
        id=str(row[0]),
        message_id=message_id,
        is_correct=payload.is_correct,
        actual_classification=payload.actual_classification,
        created_at=row[1].isoformat(),
    )


@router.get("/messages/{message_id}/feedback", response_model=FeedbackOut | None)
def get_feedback_for_message(message_id: str, user: dict = Depends(auth.get_current_user_required)):
    validate_uuid(message_id, "message id")
    try:
        with db.pool.connection() as conn:
            prediction_id = _latest_prediction_id(conn, message_id, user["sub"])
            row = conn.execute(
                """
                SELECT id, is_correct, actual_classification, created_at
                FROM feedback WHERE prediction_id = %s AND user_id = %s
                """,
                (prediction_id, user["sub"]),
            ).fetchone()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not load feedback")

    if row is None:
        return None
    return FeedbackOut(
        id=str(row[0]),
        message_id=message_id,
        is_correct=row[1],
        actual_classification=row[2],
        created_at=row[3].isoformat(),
    )


@router.get("/feedback", response_model=list[FeedbackOut])
def list_feedback(user: dict = Depends(auth.get_current_user_required)):
    try:
        with db.pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT f.id, p.message_id, f.is_correct, f.actual_classification, f.created_at
                FROM feedback f
                JOIN predictions p ON p.id = f.prediction_id
                WHERE f.user_id = %s
                ORDER BY f.created_at DESC
                LIMIT 200
                """,
                (user["sub"],),
            ).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load feedback")

    return [
        FeedbackOut(
            id=str(r[0]), message_id=str(r[1]), is_correct=r[2], actual_classification=r[3], created_at=r[4].isoformat()
        )
        for r in rows
    ]
