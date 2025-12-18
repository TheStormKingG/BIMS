-- ============================================================================
-- User Preferences Fix: Add tips_count column and ensure unique constraint
-- ============================================================================
-- Run this SQL in your Supabase Dashboard SQL Editor
-- This fixes the "tips_count column not found" error

-- Add tips_count column if it doesn't exist
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS tips_count INTEGER DEFAULT 5 CHECK (tips_count >= 1 AND tips_count <= 20);

-- Clean up any duplicate preference rows (keep only the most recent one per user)
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

-- Ensure unique constraint exists (should already exist from migration 001, but ensure it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_preferences_user_id_unique'
    ) THEN
        ALTER TABLE user_preferences
        ADD CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Refresh schema cache (note: you'll need to do this manually in Supabase Dashboard)
-- Supabase Dashboard → Settings → API → Reload schema

