-- Migration: Update Goals 12 and 13
-- Goal 12: Change from checking "Spent Last 7 Days" card to viewing "Top Spending Item" section
-- Goal 13: Change from achieving daily target to setting a daily target/goal

-- Update Goal 12: Weekly Watcher -> View Top Spending Item
UPDATE system_goals
SET 
  description = 'View the "Top Spending Item" section on the Overview dashboard.',
  completion_criteria = '{"event_type": "top_spending_item_viewed", "threshold": 1, "time_window": null}'::jsonb
WHERE id = 12;

-- Update Goal 13: Target Hit -> Set Daily Target
UPDATE system_goals
SET 
  title = 'Setting the Daily Target',
  description = 'Set a target/goal for average daily spend in the Goals tab.',
  completion_criteria = '{"event_type": "daily_target_set", "threshold": 1, "time_window": null}'::jsonb
WHERE id = 13;

