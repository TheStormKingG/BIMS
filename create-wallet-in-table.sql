-- Create wallet_in table if it doesn't exist
-- This table tracks money coming into the wallet with denominations

CREATE TABLE IF NOT EXISTS wallet_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  total NUMERIC NOT NULL,
  note_5000 INTEGER DEFAULT 0,
  note_2000 INTEGER DEFAULT 0,
  note_1000 INTEGER DEFAULT 0,
  note_500 INTEGER DEFAULT 0,
  note_100 INTEGER DEFAULT 0,
  note_50 INTEGER DEFAULT 0,
  note_20 INTEGER DEFAULT 0,
  datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_in' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE wallet_in ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_in_datetime ON wallet_in(datetime DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_in_user_id ON wallet_in(user_id);

-- Enable Row Level Security
ALTER TABLE wallet_in ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own wallet_in" ON wallet_in;
CREATE POLICY "Users can view their own wallet_in"
  ON wallet_in FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert their own wallet_in" ON wallet_in;
CREATE POLICY "Users can insert their own wallet_in"
  ON wallet_in FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own wallet_in" ON wallet_in;
CREATE POLICY "Users can update their own wallet_in"
  ON wallet_in FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own wallet_in" ON wallet_in;
CREATE POLICY "Users can delete their own wallet_in"
  ON wallet_in FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_wallet_in_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wallet_in_updated_at ON wallet_in;
CREATE TRIGGER update_wallet_in_updated_at 
  BEFORE UPDATE ON wallet_in
  FOR EACH ROW 
  EXECUTE FUNCTION update_wallet_in_updated_at();

-- Add comment
COMMENT ON TABLE wallet_in IS 'Records of cash received with denomination breakdown';

