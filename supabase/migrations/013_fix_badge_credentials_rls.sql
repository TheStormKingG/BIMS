-- Fix RLS policies for badge_credentials to allow users to insert their own credentials
-- This fixes the 403 Forbidden error when issuing credentials

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own credentials" ON badge_credentials;
DROP POLICY IF EXISTS "Users can update their own credentials" ON badge_credentials;

-- RLS Policy: Users can insert their own credentials
CREATE POLICY "Users can insert their own credentials"
ON badge_credentials FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own credentials
CREATE POLICY "Users can update their own credentials"
ON badge_credentials FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also ensure users can insert their own credential events (ISSUED, SHARED)
-- Keep the existing VERIFIED policy, but add a policy for user-owned credential events
DROP POLICY IF EXISTS "Users can insert their own credential events" ON badge_credential_events;

CREATE POLICY "Users can insert their own credential events"
ON badge_credential_events FOR INSERT
WITH CHECK (
  -- Allow ISSUED and SHARED events if user owns the credential
  (event_type IN ('ISSUED', 'SHARED') AND
   EXISTS (
     SELECT 1 FROM badge_credentials
     WHERE badge_credentials.id = badge_credential_events.credential_id
     AND badge_credentials.user_id = auth.uid()
   ))
  OR
  -- Keep existing: Allow VERIFIED events from anyone (public verification tracking)
  event_type = 'VERIFIED'
);

