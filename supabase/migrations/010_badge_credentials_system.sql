-- Badge Credentials System Migration
-- Creates tables for shareable and verifiable badge certificates

-- Badge Credentials Table
CREATE TABLE IF NOT EXISTS badge_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Public display fields
  recipient_display_name TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  badge_level TEXT, -- Optional: 'Bronze', 'Silver', 'Gold'
  
  -- Issuance details
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issuing_org_name TEXT NOT NULL DEFAULT 'Stashway',
  issuing_org_url TEXT NOT NULL DEFAULT 'https://stashway.app',
  
  -- Achievement context
  goal_id INTEGER NOT NULL REFERENCES system_goals(id),
  goal_title TEXT NOT NULL,
  criteria_summary TEXT NOT NULL,
  
  -- Security & verification
  evidence_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for badge_credentials
CREATE INDEX IF NOT EXISTS idx_badge_credentials_credential_number ON badge_credentials(credential_number);
CREATE INDEX IF NOT EXISTS idx_badge_credentials_user_id ON badge_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_credentials_status ON badge_credentials(status);
CREATE INDEX IF NOT EXISTS idx_badge_credentials_user_goal ON badge_credentials(user_id, goal_id);

-- Badge Credential Events (Audit Log)
CREATE TABLE IF NOT EXISTS badge_credential_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES badge_credentials(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('ISSUED', 'SHARED', 'VERIFIED', 'REVOKED')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT
);

-- Indexes for badge_credential_events
CREATE INDEX IF NOT EXISTS idx_badge_credential_events_credential_id ON badge_credential_events(credential_id);
CREATE INDEX IF NOT EXISTS idx_badge_credential_events_event_type ON badge_credential_events(event_type);
CREATE INDEX IF NOT EXISTS idx_badge_credential_events_occurred_at ON badge_credential_events(occurred_at);

-- Enable RLS
ALTER TABLE badge_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_credential_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own credentials" ON badge_credentials;
DROP POLICY IF EXISTS "Users can view their own credential events" ON badge_credential_events;
DROP POLICY IF EXISTS "Allow public insert of VERIFIED events" ON badge_credential_events;

-- RLS Policy: Users can view their own credentials
CREATE POLICY "Users can view their own credentials"
ON badge_credentials FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can view their own credential events
CREATE POLICY "Users can view their own credential events"
ON badge_credential_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM badge_credentials
    WHERE badge_credentials.id = badge_credential_events.credential_id
    AND badge_credentials.user_id = auth.uid()
  )
);

-- RLS Policy: Allow public insert of VERIFIED events (for tracking verifications)
CREATE POLICY "Allow public insert of VERIFIED events"
ON badge_credential_events FOR INSERT
WITH CHECK (event_type = 'VERIFIED');

-- Function to verify badge credential (public access)
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

-- Grant execute to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION verify_badge_credential(TEXT) TO anon, authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_badge_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER badge_credentials_updated_at
BEFORE UPDATE ON badge_credentials
FOR EACH ROW
EXECUTE FUNCTION update_badge_credentials_updated_at();

