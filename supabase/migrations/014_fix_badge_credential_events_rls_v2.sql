-- Fix RLS policies for badge_credential_events to allow users to insert SHARED events
-- This is a corrected version that properly checks credential ownership

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert SHARED events for their own credentials" ON badge_credential_events;
DROP POLICY IF EXISTS "Allow public insert of VERIFIED events" ON badge_credential_events;

-- Create comprehensive policy that allows:
-- 1. VERIFIED events from anyone (public verification tracking)
-- 2. SHARED, ISSUED events from the credential owner
CREATE POLICY "Allow credential events"
ON badge_credential_events FOR INSERT
WITH CHECK (
  -- Allow VERIFIED events from anyone (public)
  event_type = 'VERIFIED'
  OR
  -- Allow SHARED and ISSUED events from authenticated users who own the credential
  (
    auth.uid() IS NOT NULL
    AND event_type IN ('SHARED', 'ISSUED')
    AND EXISTS (
      SELECT 1 FROM badge_credentials
      WHERE badge_credentials.id = badge_credential_events.credential_id
      AND badge_credentials.user_id = auth.uid()
    )
  )
);

