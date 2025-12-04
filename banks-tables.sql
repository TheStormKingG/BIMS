-- Stashway Banks Tables
-- Tables for tracking bank accounts and transactions

-- 1. BANKS TABLE - Track bank accounts
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  total NUMERIC DEFAULT 0,
  updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_banks_updated ON banks(updated DESC);

-- Comment
COMMENT ON TABLE banks IS 'Stores bank account names and their current balances';


-- 2. BANK_IN TABLE - Track money coming into banks
CREATE TABLE IF NOT EXISTS bank_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination UUID REFERENCES banks(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_in_destination ON bank_in(destination);
CREATE INDEX IF NOT EXISTS idx_bank_in_datetime ON bank_in(datetime DESC);

-- Comment
COMMENT ON TABLE bank_in IS 'Records of money deposited into bank accounts';


-- 3. WALLET_IN TABLE - Track money coming into wallet with denominations
CREATE TABLE IF NOT EXISTS wallet_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  total NUMERIC NOT NULL,
  note_5000 INTEGER DEFAULT 0,
  note_2000 INTEGER DEFAULT 0,
  note_1000 INTEGER DEFAULT 0,
  note_500 INTEGER DEFAULT 0,
  note_100 INTEGER DEFAULT 0,
  note_50 INTEGER DEFAULT 0,
  note_20 INTEGER DEFAULT 0,
  datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_wallet_in_datetime ON wallet_in(datetime DESC);

-- Comment
COMMENT ON TABLE wallet_in IS 'Records of cash received with denomination breakdown';

