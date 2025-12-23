-- Migration: Create user_subscriptions table for subscription management
-- This table tracks user subscription plans, trial status, and billing periods

-- Create subscription plan enum type
DO $$ BEGIN
  CREATE TYPE subscription_plan_type AS ENUM ('none', 'personal', 'pro', 'pro_max');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create subscription status enum type
DO $$ BEGIN
  CREATE TYPE subscription_status_type AS ENUM ('trialing', 'active', 'expired', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan subscription_plan_type NOT NULL DEFAULT 'none',
  status subscription_status_type NOT NULL DEFAULT 'trialing',
  trial_start_at TIMESTAMPTZ,
  trial_end_at TIMESTAMPTZ,
  plan_started_at TIMESTAMPTZ,
  plan_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own subscription
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own subscription (for plan selection)
CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: System can insert subscriptions (via service role or authenticated user)
CREATE POLICY "Users can insert their own subscription"
  ON user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER trigger_update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Create a function to get effective plan for RLS checks
-- This allows RLS policies to check user's effective plan
CREATE OR REPLACE FUNCTION get_effective_plan(p_user_id UUID)
RETURNS subscription_plan_type AS $$
DECLARE
  v_subscription user_subscriptions%ROWTYPE;
  v_effective_plan subscription_plan_type;
BEGIN
  -- Get user subscription
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;

  -- If no subscription found, return 'none'
  IF NOT FOUND THEN
    RETURN 'none';
  END IF;

  -- If trial is active, return 'pro' (trial grants Pro access)
  IF v_subscription.status = 'trialing' 
     AND v_subscription.trial_end_at IS NOT NULL 
     AND NOW() < v_subscription.trial_end_at THEN
    RETURN 'pro';
  END IF;

  -- If subscription is active, return the plan
  IF v_subscription.status = 'active' THEN
    RETURN v_subscription.plan;
  END IF;

  -- Otherwise, return 'none'
  RETURN 'none';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_effective_plan(UUID) TO authenticated;

-- Initialize existing users with trial subscriptions
-- This runs for users who don't have a subscription record yet
INSERT INTO user_subscriptions (user_id, plan, status, trial_start_at, trial_end_at)
SELECT 
  id,
  'none',
  'trialing',
  NOW(),
  NOW() + INTERVAL '14 days'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

