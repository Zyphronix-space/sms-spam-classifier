-- Adds message-text persistence (plaintext, for logged-in users only), a
-- proper per-message prediction history, and a feedback loop.
--
-- Supersedes `scans`/`saved_scans` (hash-only, no text — see README
-- Privacy section) for account-scoped history, feedback, search/filter,
-- and CSV batch results, none of which are possible without the text
-- itself. `scans`/`saved_scans` are left in place, untouched, unused.

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'batch')),
    batch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_batch ON messages (batch_id) WHERE batch_id IS NOT NULL;

-- One message can have several predictions over its lifetime (each edit
-- re-classifies and appends a new row instead of overwriting) so a user can
-- see how a re-worded message's classification changed.
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    model_version_id UUID REFERENCES model_versions(id),
    classification TEXT NOT NULL CHECK (classification IN ('spam', 'ham')),
    spam_probability DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_predictions_message ON predictions (message_id, created_at DESC);

-- One feedback row per (prediction, user) — targets whichever prediction
-- was current when the user answered "was this correct?".
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    actual_classification TEXT CHECK (actual_classification IN ('spam', 'ham')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (is_correct OR actual_classification IS NOT NULL),
    UNIQUE (prediction_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_feedback_prediction ON feedback (prediction_id);
