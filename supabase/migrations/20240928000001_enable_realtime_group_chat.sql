-- Migration: Enable Real-time Group Chat
-- Date: 20240928000001
-- Description: Enable realtime subscriptions for group chat, add RLS policies, and enhance message system

-- =====================================================
-- ENABLE REALTIME FOR MESSAGES TABLE
-- =====================================================

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages from groups they belong to
CREATE POLICY "Users can read group messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN group_participants gp ON s.group_id = gp.group_id
      JOIN users u ON gp.user_id = u.user_id
      WHERE s.session_id = messages.session_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can insert messages to groups they belong to
CREATE POLICY "Users can send group messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN group_participants gp ON s.group_id = gp.group_id
      JOIN users u ON gp.user_id = u.user_id
      WHERE s.session_id = messages.session_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update their own messages
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_participants gp
      JOIN users u ON gp.user_id = u.user_id
      WHERE gp.group_participant_id = messages.sender_id
      AND u.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own messages or if they're admin
CREATE POLICY "Users can delete own messages or admin" ON messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM group_participants gp
      JOIN users u ON gp.user_id = u.user_id
      WHERE gp.group_participant_id = messages.sender_id
      AND u.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN group_participants gp ON s.group_id = gp.group_id
      JOIN users u ON gp.user_id = u.user_id
      WHERE s.session_id = messages.session_id
      AND u.auth_user_id = auth.uid()
      AND gp.role = 'admin'
    )
  );

-- =====================================================
-- ENHANCE MESSAGES TABLE FOR GROUP CHAT
-- =====================================================

-- Add message type to differentiate between user and AI messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'user' CHECK (message_type IN ('user', 'ai', 'system'));

-- Add metadata column for storing additional message data (AI context, mentions, etc.)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add edited timestamp for message editing functionality
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

-- Add reply_to for threaded conversations (optional for future)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to INT REFERENCES messages(message_id);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);

-- =====================================================
-- CREATE USER PRESENCE TABLE
-- =====================================================

-- Table to track online users in group sessions
CREATE TABLE IF NOT EXISTS user_presence (
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_id INT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, session_id)
);

-- Enable realtime for user presence
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- RLS for user presence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read presence in their groups" ON user_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN group_participants gp ON s.group_id = gp.group_id
      JOIN users u ON gp.user_id = u.user_id
      WHERE s.session_id = user_presence.session_id
      AND u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own presence" ON user_presence
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.user_id = user_presence.user_id 
      AND u.auth_user_id = auth.uid()
    )
  );

-- Create indexes for user presence
CREATE INDEX IF NOT EXISTS idx_user_presence_session_id ON user_presence(session_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen on user_presence updates
CREATE TRIGGER trigger_update_user_last_seen
    BEFORE UPDATE ON user_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_seen();

-- Function to clean up old presence records (optional - can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM user_presence 
    WHERE status = 'offline' 
    AND last_seen < (CURRENT_TIMESTAMP - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;
