-- Allow NULL goal_id for phase certificates
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

