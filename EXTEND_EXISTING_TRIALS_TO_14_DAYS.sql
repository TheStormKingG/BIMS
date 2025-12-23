-- Update existing trial users to have a 14-day trial period
-- This extends the trial_end_at date for users who are currently in a trial
-- Sets trial_end_at to 14 days from trial_start_at

-- Option 1: Extend trials for users currently in a trial (trial_end_at > NOW())
-- This gives them a full 14 days from their original trial_start_at
UPDATE public.user_subscriptions
SET 
  trial_end_at = COALESCE(trial_start_at, NOW()) + INTERVAL '14 days',
  updated_at = NOW()
WHERE 
  status = 'trialing'
  AND trial_start_at IS NOT NULL
  AND (
    -- Either they don't have a trial_end_at yet
    trial_end_at IS NULL
    -- Or their current trial_end_at is less than 14 days from trial_start_at
    OR trial_end_at < trial_start_at + INTERVAL '14 days'
  );

-- Option 2: Reset expired trials (optional - uncomment if you want to give expired users a fresh 14-day trial)
-- This gives users whose trial expired but haven't selected a plan a fresh 14-day trial starting now
/*
UPDATE public.user_subscriptions
SET 
  status = 'trialing',
  trial_start_at = NOW(),
  trial_end_at = NOW() + INTERVAL '14 days',
  updated_at = NOW()
WHERE 
  status = 'expired'
  AND plan = 'none'
  AND trial_end_at < NOW();
*/

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

