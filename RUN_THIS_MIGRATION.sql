-- ============================================================================
-- Migration: Add name column to chat_sessions table
-- ============================================================================
-- Run this SQL in your Supabase Dashboard SQL Editor
-- Or run: supabase db push (if using Supabase CLI)

-- Add name column to chat_sessions table
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS name TEXT;

-- Create index for name search (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_name ON chat_sessions(name);

