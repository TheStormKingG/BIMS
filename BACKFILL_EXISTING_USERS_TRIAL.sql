-- Backfill Script: Give all existing users a 7-day trial
-- Run this in Supabase SQL Editor after running migration 019
-- This ensures all existing users get a trial subscription starting from now

-- Option 1: Give ALL existing users a fresh 7-day trial (RECOMMENDED)
-- This gives everyone a clean slate with 7 days starting from today
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
  NOW() + INTERVAL '7 days' AS trial_end_at,
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
  COUNT(CASE WHEN s.status = 'trialing' THEN 1 END) AS users_in_trial
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON s.user_id = u.id;

