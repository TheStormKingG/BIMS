-- Fix RLS policies for badge_credential_events to allow users to insert SHARED events

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Allow public insert of VERIFIED events" ON badge_credential_events;

-- Create policy that allows users to insert SHARED events for their own credentials
CREATE POLICY "Users can insert SHARED events for their own credentials"
ON badge_credential_events FOR INSERT
WITH CHECK (
  -- Allow VERIFIED events from anyone (public verification tracking)
  event_type = 'VERIFIED'
  OR
  -- Allow SHARED events from the credential owner
  (
    event_type = 'SHARED'
    AND EXISTS (
      SELECT 1 FROM badge_credentials
      WHERE badge_credentials.id = badge_credential_events.credential_id
      AND badge_credentials.user_id = auth.uid()
    )
  )
  OR
  -- Allow ISSUED events (typically from server-side, but allow authenticated users)
  (
    event_type = 'ISSUED'
    AND EXISTS (
      SELECT 1 FROM badge_credentials
      WHERE badge_credentials.id = badge_credential_events.credential_id
      AND badge_credentials.user_id = auth.uid()
    )
  )
);

