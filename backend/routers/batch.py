"""POST /batch (CSV upload -> validate -> classify -> save -> summarize),
GET /batch/{batch_id}/export (download the results as CSV).

The uploaded file is parsed entirely in memory with pandas (already a
project dependency for ml/) and never touches disk — there is nothing to
clean up and no path-traversal surface. Each valid row becomes a `messages`
(source='batch', shared batch_id) + `predictions` row, same as a single
POST /messages, so batch results show up in search/history/feedback too.
"""

import io
import uuid
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile
from pydantic import BaseModel

import auth
import classify
import db
import model_state
from validation import validate_uuid

router = APIRouter(tags=["batch"])

MAX_FILE_BYTES = 1 * 1024 * 1024  # 1MB
MAX_ROWS = 500
MESSAGE_COLUMN_CANDIDATES = ("message", "text", "sms", "body")


class BatchRowResult(BaseModel):
    row: int
    message: str | None = None
    classification: str | None = None
    spam_probability: float | None = None
    error: str | None = None


class BatchResult(BaseModel):
    batch_id: str
    total: int
    valid: int
    invalid: int
    spam_count: int
    ham_count: int
    spam_percentage: float
    results: list[BatchRowResult]


def _pick_message_column(columns: list[str]) -> str:
    lowered = {c.lower(): c for c in columns}
    for candidate in MESSAGE_COLUMN_CANDIDATES:
        if candidate in lowered:
            return lowered[candidate]
    return columns[0]


def _csv_safe(value: str) -> str:
    """Basic CSV-injection mitigation: a leading =, +, -, or @ can be
    interpreted as a formula by spreadsheet software opening the export."""
    if value and value[0] in ("=", "+", "-", "@"):
        return "'" + value
    return value


@router.post("/batch", response_model=BatchResult)
async def upload_batch(file: UploadFile, user: dict = Depends(auth.get_current_user_required)):
    if not (file.filename or "").lower().endswith(".csv") and file.content_type not in (
        "text/csv",
        "application/vnd.ms-excel",
    ):
        raise HTTPException(status_code=400, detail="file must be a .csv file")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="file is empty")
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail=f"file exceeds the {MAX_FILE_BYTES // 1024}KB limit")

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="could not parse file as CSV")

    if df.empty or len(df.columns) == 0:
        raise HTTPException(status_code=400, detail="CSV has no rows or columns")
    if len(df) > MAX_ROWS:
        raise HTTPException(status_code=400, detail=f"CSV exceeds the {MAX_ROWS}-row limit")

    message_col = _pick_message_column(list(df.columns))
    batch_id = str(uuid.uuid4())

    results: list[BatchRowResult] = []
    spam_count = 0
    ham_count = 0

    try:
        with db.pool.connection() as conn:
            for i, raw in enumerate(df[message_col].tolist(), start=1):
                text = "" if pd.isna(raw) else str(raw).strip()
                if not text:
                    results.append(BatchRowResult(row=i, error="empty message"))
                    continue
                if len(text) > 2000:
                    results.append(BatchRowResult(row=i, error="message exceeds 2000 characters"))
                    continue

                label, spam_probability = classify.classify(text)
                message_row = conn.execute(
                    """
                    INSERT INTO messages (user_id, body, source, batch_id)
                    VALUES (%s, %s, 'batch', %s)
                    RETURNING id
                    """,
                    (user["sub"], text, batch_id),
                ).fetchone()
                conn.execute(
                    """
                    INSERT INTO predictions (message_id, model_version_id, classification, spam_probability)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (message_row[0], model_state.MODEL_VERSION_ID, label, spam_probability),
                )
                results.append(
                    BatchRowResult(row=i, message=text, classification=label, spam_probability=spam_probability)
                )
                if label == "spam":
                    spam_count += 1
                else:
                    ham_count += 1
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="could not process batch")

    valid = spam_count + ham_count
    total = len(results)
    spam_percentage = round((spam_count / valid * 100), 2) if valid else 0.0

    return BatchResult(
        batch_id=batch_id,
        total=total,
        valid=valid,
        invalid=total - valid,
        spam_count=spam_count,
        ham_count=ham_count,
        spam_percentage=spam_percentage,
        results=results,
    )


@router.get("/batch/{batch_id}/export")
def export_batch(batch_id: str, user: dict = Depends(auth.get_current_user_required)):
    validate_uuid(batch_id, "batch id")
    try:
        with db.pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT m.id, m.body, p.classification, p.spam_probability, m.created_at
                FROM messages m
                JOIN LATERAL (
                    SELECT classification, spam_probability
                    FROM predictions WHERE message_id = m.id
                    ORDER BY created_at DESC LIMIT 1
                ) p ON true
                WHERE m.batch_id = %s AND m.user_id = %s
                ORDER BY m.created_at ASC
                """,
                (batch_id, user["sub"]),
            ).fetchall()
    except Exception:
        raise HTTPException(status_code=500, detail="could not export batch")

    if not rows:
        raise HTTPException(status_code=404, detail="batch not found")

    lines = ["id,message,classification,spam_probability,created_at"]
    for r in rows:
        message = _csv_safe(str(r[1]).replace('"', '""'))
        lines.append(f'{r[0]},"{message}",{r[2]},{r[3]},{r[4].isoformat()}')
    csv_body = "\n".join(lines) + "\n"

    return Response(
        content=csv_body,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="batch-{batch_id}.csv"'},
    )
