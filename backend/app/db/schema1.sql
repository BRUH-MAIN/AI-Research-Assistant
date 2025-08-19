-- Table to store session-level information
CREATE TABLE chat_sessions (
    session_id UUID PRIMARY KEY,       -- unique ID for the session
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table to store messages associated with each session
CREATE TABLE chat_messages (
    message_id BIGSERIAL PRIMARY KEY,  -- unique ID for each message
    session_id UUID NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role TEXT NOT NULL,                -- e.g., 'user', 'assistant', 'system'
    content TEXT NOT NULL,             -- actual message text
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-update updated_at in chat_sessions whenever a row is updated
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_session_timestamp
BEFORE UPDATE ON chat_sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_timestamp();
