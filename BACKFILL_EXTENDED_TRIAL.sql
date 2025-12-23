-- Backfill Script: Give existing users an extended 14-day trial (Staged Rollout)
-- Use this if you want to give existing users more time than new users
-- This is a safer option if you're concerned about operational impact

INSERT INTO public.user_subscriptions (
  user_id,
  plan,
  status,
  trial_start_at,
  trial_end_at,
  created_at,
  updated_at
)
SELECT
  u.id AS user_id,
  'none' AS plan,
  'trialing' AS status,
  NOW() AS trial_start_at,
  NOW() + INTERVAL '14 days' AS trial_end_at,  -- 14 days for existing users
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON s.user_id = u.id
WHERE s.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify the results
SELECT 
  COUNT(*) AS total_users,
  COUNT(s.user_id) AS users_with_subscription,
  COUNT(CASE WHEN s.status = 'trialing' THEN 1 END) AS users_in_trial,
  MIN(s.trial_end_at) AS earliest_trial_end,
  MAX(s.trial_end_at) AS latest_trial_end
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON s.user_id = u.id;

