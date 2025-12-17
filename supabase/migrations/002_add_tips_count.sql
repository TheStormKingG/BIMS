-- Add tips_count column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS tips_count INTEGER DEFAULT 5 CHECK (tips_count >= 1 AND tips_count <= 20);

