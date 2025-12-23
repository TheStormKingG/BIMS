-- Update existing trial users to have a 14-day trial period
-- This extends the trial_end_at date for users who are currently in a trial
-- Sets trial_end_at to 14 days from trial_start_at

UPDATE public.user_subscriptions
SET 
  trial_end_at = COALESCE(trial_start_at, NOW()) + INTERVAL '14 days',
  updated_at = NOW()
WHERE 
  status = 'trialing'
  AND (
    -- Either they don't have a trial_end_at yet
    trial_end_at IS NULL
    -- Or their current trial_end_at is less than 14 days from trial_start_at
    OR (trial_start_at IS NOT NULL AND trial_end_at < trial_start_at + INTERVAL '14 days')
  );

-- Verify the results
SELECT 
  COUNT(*) AS users_updated,
  COUNT(CASE WHEN status = 'trialing' THEN 1 END) AS users_in_trial,
  MIN(trial_start_at) AS earliest_trial_start,
  MAX(trial_start_at) AS latest_trial_start,
  MIN(trial_end_at) AS earliest_trial_end,
  MAX(trial_end_at) AS latest_trial_end,
  AVG(EXTRACT(EPOCH FROM (trial_end_at - trial_start_at)) / 86400) AS avg_trial_duration_days
FROM public.user_subscriptions
WHERE status = 'trialing';

