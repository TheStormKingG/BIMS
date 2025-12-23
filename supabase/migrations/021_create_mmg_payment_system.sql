-- Migration: Create MMG payment system tables
-- This migration creates tables for manual MMG subscription payment workflow

-- Create payment request status enum
DO $$ BEGIN
  CREATE TYPE mmg_payment_status_type AS ENUM (
    'generated',
    'user_uploaded',
    'ai_parsed',
    'admin_uploaded',
    'verified',
    'rejected',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create artifact kind enum
DO $$ BEGIN
  CREATE TYPE mmg_artifact_kind_type AS ENUM ('user_success', 'admin_received');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create extraction kind enum (same values as artifact)
DO $$ BEGIN
  CREATE TYPE mmg_extraction_kind_type AS ENUM ('user_success', 'admin_received');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create actor role enum
DO $$ BEGIN
  CREATE TYPE mmg_actor_role_type AS ENUM ('user', 'admin', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table A: mmg_payment_requests
CREATE TABLE IF NOT EXISTS mmg_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('personal', 'pro', 'pro_max')),
  amount_expected NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GYD',
  reference_code CHAR(24) NOT NULL UNIQUE,
  reference_secret TEXT NOT NULL, -- PRIVATE, server-side only
  generated_message TEXT NOT NULL,
  status mmg_payment_status_type NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_uploaded_at TIMESTAMPTZ,
  admin_uploaded_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  last_error TEXT
);

-- Table B: mmg_payment_artifacts (screenshot storage references)
CREATE TABLE IF NOT EXISTS mmg_payment_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES mmg_payment_requests(id) ON DELETE CASCADE,
  kind mmg_artifact_kind_type NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table C: mmg_payment_extractions (AI parsing results)
CREATE TABLE IF NOT EXISTS mmg_payment_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES mmg_payment_requests(id) ON DELETE CASCADE,
  kind mmg_extraction_kind_type NOT NULL,
  extracted_amount NUMERIC(12, 2),
  extracted_transaction_id TEXT,
  extracted_reference_code CHAR(24),
  extracted_datetime TIMESTAMPTZ,
  extracted_sender TEXT,
  extracted_receiver TEXT,
  raw_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table D: mmg_payment_events (audit log)
CREATE TABLE IF NOT EXISTS mmg_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES mmg_payment_requests(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role mmg_actor_role_type NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mmg_payment_requests_user_id ON mmg_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_mmg_payment_requests_status ON mmg_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_mmg_payment_requests_reference_code ON mmg_payment_requests(reference_code);
CREATE INDEX IF NOT EXISTS idx_mmg_payment_requests_expires_at ON mmg_payment_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_mmg_payment_artifacts_request_id ON mmg_payment_artifacts(request_id);
CREATE INDEX IF NOT EXISTS idx_mmg_payment_extractions_request_id ON mmg_payment_extractions(request_id);
CREATE INDEX IF NOT EXISTS idx_mmg_payment_events_request_id ON mmg_payment_events(request_id);
CREATE INDEX IF NOT EXISTS idx_mmg_payment_events_actor_user_id ON mmg_payment_events(actor_user_id);

-- RLS Policies for mmg_payment_requests
ALTER TABLE mmg_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment requests"
  ON mmg_payment_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert payment requests (via edge function)"
  ON mmg_payment_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update their own requests (only edge functions can)
-- Admins will be handled via service role in edge functions

-- RLS Policies for mmg_payment_artifacts
ALTER TABLE mmg_payment_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view artifacts for their requests"
  ON mmg_payment_artifacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mmg_payment_requests
      WHERE mmg_payment_requests.id = mmg_payment_artifacts.request_id
      AND mmg_payment_requests.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert artifacts for their requests"
  ON mmg_payment_artifacts FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM mmg_payment_requests
      WHERE mmg_payment_requests.id = mmg_payment_artifacts.request_id
      AND mmg_payment_requests.user_id = auth.uid()
    )
  );

-- RLS Policies for mmg_payment_extractions
ALTER TABLE mmg_payment_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view extractions for their requests"
  ON mmg_payment_extractions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mmg_payment_requests
      WHERE mmg_payment_requests.id = mmg_payment_extractions.request_id
      AND mmg_payment_requests.user_id = auth.uid()
    )
  );

-- Insertions will be via edge functions (service role)

-- RLS Policies for mmg_payment_events
ALTER TABLE mmg_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for their requests"
  ON mmg_payment_events FOR SELECT
  USING (
    request_id IS NULL
    OR EXISTS (
      SELECT 1 FROM mmg_payment_requests
      WHERE mmg_payment_requests.id = mmg_payment_events.request_id
      AND mmg_payment_requests.user_id = auth.uid()
    )
  );

-- Insertions will be via edge functions

-- Create user_notifications table for plan upgrade notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);

-- RLS Policies for user_notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insertions will be via edge functions/service role

COMMENT ON TABLE mmg_payment_requests IS 'MMG payment requests with unique reference codes';
COMMENT ON COLUMN mmg_payment_requests.reference_secret IS 'PRIVATE: Never expose to client, server-side only';
COMMENT ON TABLE mmg_payment_artifacts IS 'Storage references for uploaded payment screenshots';
COMMENT ON TABLE mmg_payment_extractions IS 'AI-extracted fields from payment screenshots';
COMMENT ON TABLE mmg_payment_events IS 'Audit log for all payment-related events';
COMMENT ON TABLE user_notifications IS 'User notifications including plan upgrade confirmations';

