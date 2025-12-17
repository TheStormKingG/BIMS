-- Update goals table to support analytics-based goal types
-- First, drop the existing check constraint
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_goal_type_check;

-- Add new goal types
ALTER TABLE goals ADD CONSTRAINT goals_goal_type_check 
  CHECK (goal_type IN (
    'spent_last_24h',
    'spent_last_7d',
    'spent_last_30d',
    'avg_daily',
    'avg_weekly',
    'avg_monthly',
    'top_category_spent'
  ));

-- The period column is no longer needed for these goal types, but we'll keep it for backward compatibility
-- category column can be used for top_category_spent to store the category name

