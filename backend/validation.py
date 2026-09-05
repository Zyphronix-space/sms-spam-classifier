"""Small shared helpers reused by every router that takes a UUID path param."""

import uuid

from fastapi import HTTPException


def validate_uuid(value: str, what: str = "id") -> None:
    try:
        uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"invalid {what}")
