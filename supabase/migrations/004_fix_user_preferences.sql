-- Fix user_preferences table: Add tips_count column and unique constraint on user_id
-- This migration ensures:
-- 1. tips_count column exists (if migration 002 wasn't run)
-- 2. Only one preference row per user (enforced by unique constraint)
-- 3. Proper defaults for new columns

-- Add tips_count column if it doesn't exist
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS tips_count INTEGER DEFAULT 5 CHECK (tips_count >= 1 AND tips_count <= 20);

-- Add unique constraint on user_id to prevent duplicates
-- First, handle any existing duplicates by keeping only the most recent one per user
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, COUNT(*) as cnt
        FROM user_preferences
        GROUP BY user_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- If duplicates exist, keep only the most recent one per user
    IF duplicate_count > 0 THEN
        DELETE FROM user_preferences
        WHERE id NOT IN (
            SELECT DISTINCT ON (user_id) id
            FROM user_preferences
            ORDER BY user_id, updated_at DESC, created_at DESC
        );
    END IF;
END $$;

-- Add unique constraint (will fail if duplicates still exist, but we just cleaned them)
ALTER TABLE user_preferences
DROP CONSTRAINT IF EXISTS user_preferences_user_id_unique;

ALTER TABLE user_preferences
ADD CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id);

