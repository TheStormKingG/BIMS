-- Backfill Badge Credentials for Existing Badges
-- This migration creates credentials for badges that were earned before the badge_credentials table existed
-- Note: Credentials created by this script will have placeholder signatures.
-- The client-side backfill utility should be used to properly sign them.

-- Function to identify badges that need credentials (for client-side backfill)
-- This function returns badges that were earned but don't have credentials yet
CREATE OR REPLACE FUNCTION get_badges_needing_credentials()
RETURNS TABLE(
  user_id UUID,
  goal_id INTEGER,
  badge_id INTEGER,
  badge_name TEXT,
  badge_description TEXT,
  goal_title TEXT,
  goal_description TEXT,
  earned_at TIMESTAMPTZ,
  user_email TEXT,
  user_display_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ub.user_id,
    b.goal_id,
    ub.badge_id,
    bd.badge_name,
    bd.badge_description,
    sg.title as goal_title,
    sg.description as goal_description,
    ub.earned_at,
    u.email as user_email,
    COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'display_name',
      split_part(u.email, '@', 1)
    ) as user_display_name
  FROM user_badges ub
  INNER JOIN badges b ON ub.badge_id = b.badge_id
  INNER JOIN badges bd ON ub.badge_id = bd.badge_id
  INNER JOIN system_goals sg ON b.goal_id = sg.id
  INNER JOIN auth.users u ON ub.user_id = u.id
  WHERE NOT EXISTS (
    SELECT 1 
    FROM badge_credentials bc
    WHERE bc.user_id = ub.user_id 
      AND bc.goal_id = b.goal_id
      AND bc.status = 'ACTIVE'
  )
  ORDER BY ub.earned_at ASC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_badges_needing_credentials() TO authenticated;

-- Old function (kept for reference, but we'll use client-side backfill instead)
CREATE OR REPLACE FUNCTION backfill_badge_credentials()
RETURNS TABLE(
  user_id UUID,
  goal_id INTEGER,
  credential_created BOOLEAN,
  credential_number TEXT
) AS $$
DECLARE
  badge_record RECORD;
  user_record RECORD;
  goal_record RECORD;
  badge_detail RECORD;
  new_credential_number TEXT;
  year_prefix TEXT;
  random_part TEXT;
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i INTEGER;
  existing_cred RECORD;
  canonical_payload JSONB;
  evidence_hash TEXT;
  signature TEXT;
  issued_at TIMESTAMPTZ;
BEGIN
  -- Loop through all user_badges
  FOR badge_record IN 
    SELECT ub.user_id, ub.badge_id, ub.earned_at, b.goal_id
    FROM user_badges ub
    INNER JOIN badges b ON ub.badge_id = b.badge_id
    ORDER BY ub.earned_at ASC
  LOOP
    -- Check if credential already exists
    SELECT * INTO existing_cred
    FROM badge_credentials
    WHERE badge_credentials.user_id = badge_record.user_id
      AND badge_credentials.goal_id = badge_record.goal_id
      AND badge_credentials.status = 'ACTIVE'
    LIMIT 1;
    
    -- Skip if credential already exists
    IF existing_cred IS NOT NULL THEN
      CONTINUE;
    END IF;
    
    -- Get user details
    SELECT id, email, raw_user_meta_data INTO user_record
    FROM auth.users
    WHERE id = badge_record.user_id;
    
    IF user_record IS NULL THEN
      CONTINUE; -- Skip if user not found
    END IF;
    
    -- Get goal details
    SELECT * INTO goal_record
    FROM system_goals
    WHERE id = badge_record.goal_id;
    
    IF goal_record IS NULL THEN
      CONTINUE; -- Skip if goal not found
    END IF;
    
    -- Get badge details
    SELECT * INTO badge_detail
    FROM badges
    WHERE badge_id = badge_record.badge_id;
    
    IF badge_detail IS NULL THEN
      CONTINUE; -- Skip if badge not found
    END IF;
    
    -- Generate credential number (STW-YYYY-XXXXXX)
    year_prefix := TO_CHAR(COALESCE(badge_record.earned_at, NOW()), 'YYYY');
    random_part := '';
    FOR i IN 1..6 LOOP
      random_part := random_part || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    new_credential_number := 'STW-' || year_prefix || '-' || random_part;
    
    -- Ensure uniqueness (retry if collision)
    WHILE EXISTS (SELECT 1 FROM badge_credentials bc WHERE bc.credential_number = new_credential_number) LOOP
      random_part := '';
      FOR i IN 1..6 LOOP
        random_part := random_part || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      new_credential_number := 'STW-' || year_prefix || '-' || random_part;
    END LOOP;
    
    -- Use earned_at as issued_at, or current time if not available
    issued_at := COALESCE(badge_record.earned_at, NOW());
    
    -- Get recipient display name (prefer metadata, fallback to email username)
    DECLARE
      recipient_name TEXT;
    BEGIN
      recipient_name := COALESCE(
        user_record.raw_user_meta_data->>'full_name',
        user_record.raw_user_meta_data->>'display_name',
        split_part(user_record.email, '@', 1)
      );
      
      -- Create canonical payload for signature (simplified - actual signature will be done client-side)
      -- For backfill, we'll use a placeholder signature that indicates it was backfilled
      canonical_payload := jsonb_build_object(
        'credential_number', new_credential_number,
        'badge_name', badge_detail.badge_name,
        'recipient_display_name', recipient_name,
        'issued_at', issued_at::text,
        'goal_id', goal_record.id,
        'goal_title', goal_record.title,
        'status', 'ACTIVE'
      );
      
      -- Generate evidence hash (SHA256 of canonical JSON)
      evidence_hash := encode(digest(canonical_payload::text, 'sha256'), 'hex');
      
      -- For backfilled credentials, use a special signature prefix
      -- The actual signature verification will need to account for this
      signature := 'backfilled-' || evidence_hash;
      
      -- Insert credential
      INSERT INTO badge_credentials (
        credential_number,
        user_id,
        recipient_display_name,
        badge_name,
        badge_description,
        goal_id,
        goal_title,
        criteria_summary,
        evidence_hash,
        signature,
        status,
        issued_at,
        created_at,
        updated_at
      ) VALUES (
        new_credential_number,
        badge_record.user_id,
        recipient_name,
        badge_detail.badge_name,
        badge_detail.badge_description,
        goal_record.id,
        goal_record.title,
        goal_record.description,
        evidence_hash,
        signature,
        'ACTIVE',
        issued_at,
        NOW(),
        NOW()
      );
      
      -- Log issuance event
      INSERT INTO badge_credential_events (
        credential_id,
        event_type,
        metadata,
        occurred_at
      ) VALUES (
        (SELECT id FROM badge_credentials WHERE credential_number = new_credential_number),
        'ISSUED',
        jsonb_build_object(
          'backfilled', true,
          'original_earned_at', badge_record.earned_at,
          'goal_id', goal_record.id
        ),
        NOW()
      );
      
      -- Return result
      RETURN QUERY SELECT 
        badge_record.user_id,
        badge_record.goal_id,
        true,
        new_credential_number;
    END;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the backfill function
-- Note: This will create credentials for all existing badges
SELECT * FROM backfill_badge_credentials();

-- Optionally, drop the function after use (uncomment if desired)
-- DROP FUNCTION IF EXISTS backfill_badge_credentials();

