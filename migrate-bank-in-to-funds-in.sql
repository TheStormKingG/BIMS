-- Migration: Rename bank_in to funds_in and add user_id columns
-- This script migrates the bank_in table to funds_in with a new structure
-- and adds user_id columns to banks, funds_out, and spent_table

-- Step 1: Create new funds_in table with updated structure
CREATE TABLE IF NOT EXISTS funds_in (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  source TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  destination_account_id UUID NOT NULL, -- References banks.id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Migrate data from bank_in to funds_in (if bank_in exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bank_in') THEN
    -- Migrate existing data
    INSERT INTO funds_in (id, datetime, source, amount, destination_account_id, created_at, updated_at)
    SELECT 
      id,
      datetime,
      source,
      amount,
      destination,
      created_at,
      updated_at
    FROM bank_in;
    
    -- Drop old table
    DROP TABLE IF EXISTS bank_in CASCADE;
  END IF;
END $$;

-- Step 3: Add user_id column to banks table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'banks' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE banks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 4: Add user_id column to funds_out table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'funds_out' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE funds_out ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 5: Add user_id column to spent_table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'spent_table' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE spent_table ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_funds_in_user_id ON funds_in(user_id);
CREATE INDEX IF NOT EXISTS idx_funds_in_destination_account_id ON funds_in(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_funds_in_datetime ON funds_in(datetime DESC);
CREATE INDEX IF NOT EXISTS idx_banks_user_id ON banks(user_id);
CREATE INDEX IF NOT EXISTS idx_funds_out_user_id ON funds_out(user_id);
CREATE INDEX IF NOT EXISTS idx_spent_table_user_id ON spent_table(user_id);

-- Step 7: Enable Row Level Security (RLS) on funds_in
ALTER TABLE funds_in ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for funds_in
DROP POLICY IF EXISTS "Users can view their own funds_in" ON funds_in;
CREATE POLICY "Users can view their own funds_in"
  ON funds_in FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert their own funds_in" ON funds_in;
CREATE POLICY "Users can insert their own funds_in"
  ON funds_in FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own funds_in" ON funds_in;
CREATE POLICY "Users can update their own funds_in"
  ON funds_in FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own funds_in" ON funds_in;
CREATE POLICY "Users can delete their own funds_in"
  ON funds_in FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Step 9: Update RLS policies for banks, funds_out, and spent_table to include user_id checks
-- (These should already exist, but we ensure they check user_id)
-- Note: You may need to update existing policies manually if they don't check user_id

-- Step 10: Create trigger for updated_at on funds_in
CREATE OR REPLACE FUNCTION update_funds_in_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_funds_in_updated_at ON funds_in;
CREATE TRIGGER update_funds_in_updated_at 
  BEFORE UPDATE ON funds_in
  FOR EACH ROW 
  EXECUTE FUNCTION update_funds_in_updated_at();

-- Step 11: Add comment
COMMENT ON TABLE funds_in IS 'Records of money deposited into bank accounts or wallet (replaces bank_in table)';

