"""POST/GET/PUT/DELETE /messages — the persisted, searchable message store
that replaced `scans` (see README Privacy section for why). Every route
requires a session and every query is scoped to `user_id = <current user>`;
another user's message id 404s rather than 403ing, so its existence isn't
leaked either way (same convention the old scans.py used).

Editing a message re-classifies it and *appends* a new predictions row
rather than overwriting the old one, so a message's classification history
survives edits.
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

import auth
import classify
import db
import model_state
from validation import validate_uuid

router = APIRouter(prefix="/messages", tags=["messages"])

SORT_COLUMNS = {
    "created_at_desc": "m.created_at DESC",
    "created_at_asc": "m.created_at ASC",
    "probability_desc": "p.spam_probability DESC",
    "probability_asc": "p.spam_probability ASC",
}


class MessageInput(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class PredictionOut(BaseModel):
    id: str
    classification: str
    spam_probability: float
    created_at: str


class FeedbackOut(BaseModel):
    id: str
    is_correct: bool
    actual_classification: str | None
    created_at: str


class MessageOut(BaseModel):
    id: str
    message: str
    classification: str
    spam_probability: float
    created_at: str
    updated_at: str


class MessageDetail(MessageOut):
    predictions: list[PredictionOut]
    feedback: FeedbackOut | None


def _insert_prediction(conn, message_id: str) -> tuple[str, str, float, str]:
    """Classifies message_id's current body and inserts a predictions row.
    Returns (prediction_id, classification, spam_probability, created_at)."""
    body = conn.execute("SELECT body FROM messages WHERE id = %s", (message_id,)).fetchone()[0]
    label, spam_probability = classify.classify(body)
    row = conn.execute(
        """
        INSERT INTO predictions (message_id, model_version_id, classification, spam_probability)
        VALUES (%s, %s, %s, %s)
        RETURNING id, classification, spam_probability, created_at
        """,
        (message_id, model_state.MODEL_VERSION_ID, label, spam_probability),
    ).fetchone()
    return str(row[0]), row[1], row[2], row[3].isoformat()


@router.post("", response_model=MessageOut, status_code=201)
def create_message(payload: MessageInput, user: dict = Depends(auth.get_current_user_required)):
    body = payload.message.strip()
    if not body:
        raise HTTPException(status_code=422, detail="message must not be blank")
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                """
                INSERT INTO messages (user_id, body, source)
                VALUES (%s, %s, 'manual')
                RETURNING id, body, created_at, updated_at
                """,
                (user["sub"], body),
            ).fetchone()
            message_id = str(row[0])
            _pred_id, classification, spam_probability, _pred_created_at = _insert_prediction(conn, message_id)
    except Exception:
        raise HTTPException(status_code=500, detail="could not create message")

    return MessageOut(
        id=message_id,
        message=row[1],
        classification=classification,
        spam_probability=spam_probability,
        created_at=row[2].isoformat(),
        updated_at=row[3].isoformat(),
    )


@router.get("", response_model=list[MessageOut])
def list_messages(
    q: str | None = Query(default=None, max_length=2000),
    classification: Literal["spam", "ham"] | None = Query(default=None),
    sort: Literal["created_at_desc", "created_at_asc", "probability_desc", "probability_asc"] = Query(
        default="created_at_desc"
    ),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(auth.get_current_user_required),
):
    where = ["m.user_id = %s"]
    params: list = [user["sub"]]
    if q:
        where.append("m.body ILIKE %s")
        params.append(f"%{q}%")
    if classification:
        where.append("p.classification = %s")
        params.append(classification)

    sql = f"""
        SELECT m.id, m.body, m.created_at, m.updated_at, p.classification, p.spam_probability
        FROM messages m
        JOIN LATERAL (
            SELECT classification, spam_probability
            FROM predictions
            WHERE message_id = m.id
            ORDER BY created_at DESC
            LIMIT 1
        ) p ON true
        WHERE {' AND '.join(where)}
        ORDER BY {SORT_COLUMNS[sort]}
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    try:
        with db.pool.connection() as conn:
            rows = conn.execute(sql, params).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="could not load messages")

    return [
        MessageOut(
            id=str(r[0]),
            message=r[1],
            created_at=r[2].isoformat(),
            updated_at=r[3].isoformat(),
            classification=r[4],
            spam_probability=r[5],
        )
        for r in rows
    ]


@router.get("/{message_id}", response_model=MessageDetail)
def get_message(message_id: str, user: dict = Depends(auth.get_current_user_required)):
    validate_uuid(message_id, "message id")
    try:
        with db.pool.connection() as conn:
            msg = conn.execute(
                "SELECT id, body, created_at, updated_at FROM messages WHERE id = %s AND user_id = %s",
                (message_id, user["sub"]),
            ).fetchone()
            if msg is None:
                raise HTTPException(status_code=404, detail="message not found")

            preds = conn.execute(
                """
                SELECT id, classification, spam_probability, created_at
                FROM predictions WHERE message_id = %s ORDER BY created_at DESC
                """,
                (message_id,),
            ).fetchall()

            fb = conn.execute(
                """
                SELECT f.id, f.is_correct, f.actual_classification, f.created_at
                FROM feedback f
                WHERE f.prediction_id = %s AND f.user_id = %s
                """,
                (str(preds[0][0]), user["sub"]),
            ).fetchone()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not load message")

    return MessageDetail(
        id=str(msg[0]),
        message=msg[1],
        created_at=msg[2].isoformat(),
        updated_at=msg[3].isoformat(),
        classification=preds[0][1],
        spam_probability=preds[0][2],
        predictions=[
            PredictionOut(id=str(p[0]), classification=p[1], spam_probability=p[2], created_at=p[3].isoformat())
            for p in preds
        ],
        feedback=(
            FeedbackOut(id=str(fb[0]), is_correct=fb[1], actual_classification=fb[2], created_at=fb[3].isoformat())
            if fb
            else None
        ),
    )


@router.put("/{message_id}", response_model=MessageOut)
def update_message(message_id: str, payload: MessageInput, user: dict = Depends(auth.get_current_user_required)):
    validate_uuid(message_id, "message id")
    body = payload.message.strip()
    if not body:
        raise HTTPException(status_code=422, detail="message must not be blank")
    try:
        with db.pool.connection() as conn:
            row = conn.execute(
                """
                UPDATE messages SET body = %s, updated_at = now()
                WHERE id = %s AND user_id = %s
                RETURNING id, body, created_at, updated_at
                """,
                (body, message_id, user["sub"]),
            ).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="message not found")
            _pred_id, classification, spam_probability, _pred_created_at = _insert_prediction(conn, message_id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not update message")

    return MessageOut(
        id=str(row[0]),
        message=row[1],
        classification=classification,
        spam_probability=spam_probability,
        created_at=row[2].isoformat(),
        updated_at=row[3].isoformat(),
    )


@router.delete("/{message_id}")
def delete_message(message_id: str, user: dict = Depends(auth.get_current_user_required)):
    validate_uuid(message_id, "message id")
    try:
        with db.pool.connection() as conn:
            result = conn.execute(
                "DELETE FROM messages WHERE id = %s AND user_id = %s", (message_id, user["sub"])
            )
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="message not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not delete message")
    return {"message": "deleted"}
