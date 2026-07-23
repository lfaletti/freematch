-- Add liked_by column to messages for heart/like reactions
ALTER TABLE messages ADD COLUMN IF NOT EXISTS liked_by UUID[] DEFAULT '{}';
