-- Stashway Wallet Table
-- Simple single-user wallet tracking with individual columns for each denomination

-- Create wallet_snapshots table
CREATE TABLE IF NOT EXISTS wallet_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_5000 INTEGER DEFAULT 0,
  note_2000 INTEGER DEFAULT 0,
  note_1000 INTEGER DEFAULT 0,
  note_500 INTEGER DEFAULT 0,
  note_100 INTEGER DEFAULT 0,
  note_50 INTEGER DEFAULT 0,
  note_20 INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_wallet_created_at ON wallet_snapshots(created_at DESC);

-- Add a comment to the table
COMMENT ON TABLE wallet_snapshots IS 'Stores snapshots of cash wallet denomination counts over time';


