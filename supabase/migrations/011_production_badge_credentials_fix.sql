-- Production Fix for Badge Credentials System
-- This migration ensures all policies and functions are properly set up for production

-- Ensure badge_credentials table has all required columns
DO $$ 
BEGIN
  -- Add columns if they don't exist (safety check)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badge_credentials' AND column_name = 'recipient_display_name'
  ) THEN
    ALTER TABLE badge_credentials ADD COLUMN recipient_display_name TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badge_credentials' AND column_name = 'badge_description'
  ) THEN
    ALTER TABLE badge_credentials ADD COLUMN badge_description TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badge_credentials' AND column_name = 'evidence_hash'
  ) THEN
    ALTER TABLE badge_credentials ADD COLUMN evidence_hash TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badge_credentials' AND column_name = 'signature'
  ) THEN
    ALTER TABLE badge_credentials ADD COLUMN signature TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE badge_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_credential_events ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view their own credentials" ON badge_credentials;
DROP POLICY IF EXISTS "Users can view their own credential events" ON badge_credential_events;
DROP POLICY IF EXISTS "Allow public insert of VERIFIED events" ON badge_credential_events;

-- Recreate policies
CREATE POLICY "Users can view their own credentials"
ON badge_credentials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credential events"
ON badge_credential_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM badge_credentials
    WHERE badge_credentials.id = badge_credential_events.credential_id
    AND badge_credentials.user_id = auth.uid()
  )
);

CREATE POLICY "Allow public insert of VERIFIED events"
ON badge_credential_events FOR INSERT
WITH CHECK (event_type = 'VERIFIED');

-- Ensure the verify function exists and is correct
CREATE OR REPLACE FUNCTION verify_badge_credential(cred_num TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cred RECORD;
  result JSON;
BEGIN
  -- Lookup credential
  SELECT * INTO cred
  FROM badge_credentials
  WHERE credential_number = cred_num;
  
  IF NOT FOUND THEN
    RETURN json_build_object('verified', false, 'reason', 'NOT_FOUND');
  END IF;
  
  -- Check status
  IF cred.status = 'REVOKED' THEN
    RETURN json_build_object(
      'verified', false,
      'reason', 'REVOKED',
      'revoked_at', cred.revoked_at,
      'revoked_reason', cred.revoked_reason
    );
  END IF;
  
  -- Return public-safe fields only (no user_id, internal data)
  RETURN json_build_object(
    'verified', true,
    'credential_number', cred.credential_number,
    'recipient_display_name', cred.recipient_display_name,
    'badge_name', cred.badge_name,
    'badge_description', cred.badge_description,
    'badge_level', cred.badge_level,
    'issued_at', cred.issued_at,
    'issuing_org_name', cred.issuing_org_name,
    'issuing_org_url', cred.issuing_org_url,
    'goal_title', cred.goal_title,
    'criteria_summary', cred.criteria_summary,
    'signature', cred.signature,
    'status', cred.status
  );
END;
$$;

-- Ensure the function is accessible to anonymous users
GRANT EXECUTE ON FUNCTION verify_badge_credential(TEXT) TO anon, authenticated;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS badge_credentials_updated_at ON badge_credentials;

CREATE TRIGGER badge_credentials_updated_at
BEFORE UPDATE ON badge_credentials
FOR EACH ROW
EXECUTE FUNCTION update_badge_credentials_updated_at();

