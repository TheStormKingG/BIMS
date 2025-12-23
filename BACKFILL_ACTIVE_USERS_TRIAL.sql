-- Backfill Script: Give only ACTIVE existing users a 14-day trial (Alternative)
-- Use this if you want to give trials only to users who logged in recently
-- Adjust the interval (30 days) based on your definition of "active"

-- Note: This requires a way to determine active users.
-- If you have last_sign_in_at in auth.users or a profiles table, use that.
-- Otherwise, use the ALL users script instead.

-- Option 2A: Active users based on auth.users.updated_at (last activity)
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
  NOW() + INTERVAL '14 days' AS trial_end_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON s.user_id = u.id
WHERE s.user_id IS NULL
  AND u.updated_at >= NOW() - INTERVAL '30 days'  -- Users active in last 30 days
ON CONFLICT (user_id) DO NOTHING;

-- Option 2B: If you have a profiles table with last_sign_in_at
-- Uncomment and use this if you have a profiles table:
/*
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
  p.user_id,
  'none',
  'trialing',
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
FROM public.profiles p
LEFT JOIN public.user_subscriptions s ON s.user_id = p.user_id
WHERE s.user_id IS NULL
  AND p.last_sign_in_at >= NOW() - INTERVAL '30 days'
ON CONFLICT (user_id) DO NOTHING;
*/

-- Verify the results
SELECT 
  COUNT(*) AS total_active_users,
  COUNT(s.user_id) AS active_users_with_subscription,
  COUNT(CASE WHEN s.status = 'trialing' THEN 1 END) AS active_users_in_trial
FROM auth.users u
LEFT JOIN public.user_subscriptions s ON s.user_id = u.id
WHERE u.updated_at >= NOW() - INTERVAL '30 days';

