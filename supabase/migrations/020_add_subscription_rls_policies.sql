-- Migration: Add RLS policies to enforce subscription requirements
-- These policies check user's effective plan before allowing certain operations

-- Policy for receipts table: Only allow insert/select if user has Pro plan or higher
-- Note: This assumes receipts table exists. If it doesn't, this will fail gracefully.
DO $$ 
BEGIN
  -- Check if receipts table exists before adding policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') THEN
    -- Allow users to insert receipts only if they have Pro or higher
    DROP POLICY IF EXISTS "Users can insert receipts with Pro plan" ON receipts;
    CREATE POLICY "Users can insert receipts with Pro plan"
      ON receipts
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND
        get_effective_plan(auth.uid()) IN ('pro', 'pro_max')
      );

    -- Allow users to select their own receipts if they have Pro or higher
    DROP POLICY IF EXISTS "Users can select receipts with Pro plan" ON receipts;
    CREATE POLICY "Users can select receipts with Pro plan"
      ON receipts
      FOR SELECT
      USING (
        auth.uid() = user_id AND
        get_effective_plan(auth.uid()) IN ('pro', 'pro_max')
      );
  END IF;
END $$;

-- Policy for tips table: Only allow select if user has Pro plan or higher
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tips') THEN
    DROP POLICY IF EXISTS "Users can select tips with Pro plan" ON user_tips;
    CREATE POLICY "Users can select tips with Pro plan"
      ON user_tips
      FOR SELECT
      USING (
        auth.uid() = user_id AND
        get_effective_plan(auth.uid()) IN ('pro', 'pro_max')
      );
  END IF;
END $$;

-- Policy for badge_credentials: Phase certificates require Pro Max
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'badge_credentials') THEN
    -- Allow insert of phase certificates only for Pro Max users
    DROP POLICY IF EXISTS "Users can insert phase certificates with Pro Max plan" ON badge_credentials;
    CREATE POLICY "Users can insert phase certificates with Pro Max plan"
      ON badge_credentials
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND
        (
          -- Regular badges allowed for Pro and above
          (phase_number IS NULL AND get_effective_plan(auth.uid()) IN ('pro', 'pro_max')) OR
          -- Phase certificates require Pro Max
          (phase_number IS NOT NULL AND get_effective_plan(auth.uid()) = 'pro_max')
        )
      );
  END IF;
END $$;

-- Function to check bank account limit based on subscription plan
CREATE OR REPLACE FUNCTION check_bank_account_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan subscription_plan_type;
  v_account_count INTEGER;
BEGIN
  v_plan := get_effective_plan(p_user_id);
  
  -- Pro and Pro Max have unlimited accounts
  IF v_plan IN ('pro', 'pro_max') THEN
    RETURN TRUE;
  END IF;
  
  -- Personal plan allows max 2 bank accounts (excluding Cash Wallet)
  IF v_plan = 'personal' THEN
    SELECT COUNT(*) INTO v_account_count
    FROM banks
    WHERE user_id = p_user_id AND bank_name != 'Cash Wallet';
    
    RETURN v_account_count < 2;
  END IF;
  
  -- None plan: no accounts allowed (shouldn't reach here if trial works correctly)
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check goal limit based on subscription plan
CREATE OR REPLACE FUNCTION check_goal_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan subscription_plan_type;
  v_goal_count INTEGER;
BEGIN
  v_plan := get_effective_plan(p_user_id);
  
  -- Pro Max: unlimited
  IF v_plan = 'pro_max' THEN
    RETURN TRUE;
  END IF;
  
  -- Pro: max 15 goals
  IF v_plan = 'pro' THEN
    SELECT COUNT(*) INTO v_goal_count
    FROM user_goals
    WHERE user_id = p_user_id;
    
    RETURN v_goal_count < 15;
  END IF;
  
  -- Personal: max 3 goals
  IF v_plan = 'personal' THEN
    SELECT COUNT(*) INTO v_goal_count
    FROM user_goals
    WHERE user_id = p_user_id;
    
    RETURN v_goal_count < 3;
  END IF;
  
  -- None: no goals allowed
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for banks table: Limit to 2 accounts for Personal plan
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'banks') THEN
    -- Add insert policy with account limit check
    DROP POLICY IF EXISTS "Users can insert banks with plan limit check" ON banks;
    CREATE POLICY "Users can insert banks with plan limit check"
      ON banks
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND
        check_bank_account_limit(auth.uid())
      );
  END IF;
END $$;

-- Policy for user_goals: Limit custom goals based on plan
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_goals') THEN
    DROP POLICY IF EXISTS "Users can insert goals with plan limit check" ON user_goals;
    CREATE POLICY "Users can insert goals with plan limit check"
      ON user_goals
      FOR INSERT
      WITH CHECK (
        auth.uid() = user_id AND
        check_goal_limit(auth.uid())
      );
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_bank_account_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_goal_limit(UUID) TO authenticated;

