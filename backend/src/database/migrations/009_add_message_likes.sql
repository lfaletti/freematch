-- Add liked_by column to messages for heart/like reactions
ALTER TABLE messages ADD COLUMN IF NOT EXISTS liked_by UUID[] DEFAULT '{}';

-- Index for efficient message queries by match
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
