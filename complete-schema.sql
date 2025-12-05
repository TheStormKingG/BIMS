-- Stashway Complete Database Schema
-- Run this in your Supabase SQL Editor to set up all tables

-- ==============================================
-- 1. WALLET_SNAPSHOTS - Track cash wallet over time
-- ==============================================
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

CREATE INDEX IF NOT EXISTS idx_wallet_created_at ON wallet_snapshots(created_at DESC);
COMMENT ON TABLE wallet_snapshots IS 'Stores snapshots of cash wallet denomination counts over time';


-- ==============================================
-- 2. BANKS - Track bank accounts
-- ==============================================
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  total NUMERIC DEFAULT 0,
  updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banks_updated ON banks(updated DESC);
COMMENT ON TABLE banks IS 'Stores bank account names and their current balances';


-- ==============================================
-- 3. BANK_IN - Track money coming into banks
-- ==============================================
CREATE TABLE IF NOT EXISTS bank_in (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination UUID REFERENCES banks(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_in_destination ON bank_in(destination);
CREATE INDEX IF NOT EXISTS idx_bank_in_datetime ON bank_in(datetime DESC);
COMMENT ON TABLE bank_in IS 'Records of money deposited into bank accounts';


-- ==============================================
-- 4. WALLET_IN - Track money coming into wallet
-- ==============================================
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

CREATE INDEX IF NOT EXISTS idx_wallet_in_datetime ON wallet_in(datetime DESC);
COMMENT ON TABLE wallet_in IS 'Records of cash received with denomination breakdown';


-- ==============================================
-- 5. TRANSACTIONS - Track spending transactions
-- ==============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  merchant TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  account_id UUID, -- Can reference banks(id) or NULL for wallet
  source TEXT NOT NULL CHECK (source IN ('MANUAL', 'SCAN_RECEIPT', 'IMPORT_EMAIL', 'IMPORT_SMS')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
COMMENT ON TABLE transactions IS 'Records of spending transactions with itemized details';


-- ==============================================
-- SUMMARY
-- ==============================================
-- Tables created:
-- ✓ wallet_snapshots - Current wallet state with denomination counts
-- ✓ banks - Bank account names and balances
-- ✓ bank_in - Deposits/transfers into bank accounts
-- ✓ wallet_in - Cash received with denomination breakdown
-- ✓ transactions - Spending transactions with itemized details


