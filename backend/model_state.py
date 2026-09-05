"""Holds the currently-active model_versions.id, set once at app startup
(main.py's lifespan) from ml/evaluation.json, and read by every router that
records a prediction. A separate module (rather than living on `main`)
avoids a circular import between main.py and the routers it includes."""

MODEL_VERSION_ID: str | None = None
