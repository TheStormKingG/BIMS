-- ==========================================
-- Phase Certificate Migrations
-- Run these in Supabase SQL Editor
-- ==========================================
-- These migrations add support for phase certificates
-- Required for Phase 1 completion celebration and golden coin display
-- ==========================================

-- Migration 014: Allow NULL goal_id for phase certificates
-- Phase certificates use goal_id = NULL to distinguish them from regular badge credentials

ALTER TABLE badge_credentials 
  ALTER COLUMN goal_id DROP NOT NULL;

-- Remove the foreign key constraint temporarily to allow NULL values
ALTER TABLE badge_credentials 
  DROP CONSTRAINT IF EXISTS badge_credentials_goal_id_fkey;

-- Re-add the foreign key constraint but allow NULL
ALTER TABLE badge_credentials 
  ADD CONSTRAINT badge_credentials_goal_id_fkey 
  FOREIGN KEY (goal_id) REFERENCES system_goals(id) ON DELETE CASCADE;

-- Add a check constraint to ensure either goal_id is set OR phase_number is set for phase certificates
-- We'll use a phase_number column to track phase certificates
ALTER TABLE badge_credentials 
  ADD COLUMN IF NOT EXISTS phase_number INTEGER CHECK (phase_number IS NULL OR (phase_number >= 1 AND phase_number <= 5));

-- Update the unique index to allow multiple phase certificates per user (different phases)
CREATE UNIQUE INDEX IF NOT EXISTS idx_badge_credentials_user_phase 
  ON badge_credentials(user_id, phase_number) 
  WHERE phase_number IS NOT NULL;

-- ==========================================
-- Migration 015: Add support for phase certificate celebrations
-- Phase certificates use phase_number instead of goal_id/badge_id
-- ==========================================

-- Add phase_number column to user_celebrations
ALTER TABLE user_celebrations 
  ADD COLUMN IF NOT EXISTS phase_number INTEGER CHECK (phase_number IS NULL OR (phase_number >= 1 AND phase_number <= 5));

-- Make goal_id and badge_id nullable for phase certificates
ALTER TABLE user_celebrations 
  ALTER COLUMN goal_id DROP NOT NULL;

ALTER TABLE user_celebrations 
  ALTER COLUMN badge_id DROP NOT NULL;

-- Drop the foreign key constraint temporarily to allow NULL values
ALTER TABLE user_celebrations 
  DROP CONSTRAINT IF EXISTS user_celebrations_goal_id_fkey;

ALTER TABLE user_celebrations 
  DROP CONSTRAINT IF EXISTS user_celebrations_badge_id_fkey;

-- Re-add foreign key constraints but allow NULL
ALTER TABLE user_celebrations 
  ADD CONSTRAINT user_celebrations_goal_id_fkey 
  FOREIGN KEY (goal_id) REFERENCES system_goals(id) ON DELETE CASCADE;

ALTER TABLE user_celebrations 
  ADD CONSTRAINT user_celebrations_badge_id_fkey 
  FOREIGN KEY (badge_id) REFERENCES badges(badge_id) ON DELETE CASCADE;

-- Add check constraint: either (goal_id AND badge_id) OR phase_number must be set
ALTER TABLE user_celebrations 
  ADD CONSTRAINT user_celebrations_goal_or_phase_check 
  CHECK (
    (goal_id IS NOT NULL AND badge_id IS NOT NULL AND phase_number IS NULL) OR
    (goal_id IS NULL AND badge_id IS NULL AND phase_number IS NOT NULL)
  );

-- Update unique constraint to allow phase celebrations
-- First drop the existing unique constraint (it's a constraint, not just an index)
ALTER TABLE user_celebrations 
  DROP CONSTRAINT IF EXISTS user_celebrations_user_id_goal_id_key;

-- Create new unique indexes/constraints for goal-based and phase-based celebrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_celebrations_user_goal 
  ON user_celebrations(user_id, goal_id) 
  WHERE goal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_celebrations_user_phase 
  ON user_celebrations(user_id, phase_number) 
  WHERE phase_number IS NOT NULL;

-- ==========================================
-- Verification: Check if migrations ran successfully
-- ==========================================
-- Run this to verify:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'badge_credentials' 
-- AND column_name = 'phase_number';
-- 
-- Should return: phase_number | integer | YES
-- ==========================================

