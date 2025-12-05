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
-- 5. SPENT_TABLE - Track spending line items
-- ==============================================
CREATE TABLE IF NOT EXISTS spent_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL,
  item TEXT NOT NULL,
  item_cost NUMERIC NOT NULL,
  item_qty NUMERIC NOT NULL,
  item_total NUMERIC NOT NULL,
  payment_method TEXT, -- Bank account name or 'Cash Wallet'
  source TEXT NOT NULL CHECK (source IN ('MANUAL', 'SCAN_RECEIPT', 'IMPORT_EMAIL', 'IMPORT_SMS')),
  entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spent_table_transaction_datetime ON spent_table(transaction_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_spent_table_category ON spent_table(category);
CREATE INDEX IF NOT EXISTS idx_spent_table_entry_date ON spent_table(entry_date DESC);
COMMENT ON TABLE spent_table IS 'Records of spending line items with all transaction details';


-- ==============================================
-- 6. FUNDS_OUT - Track payments/withdrawals from accounts
-- ==============================================
CREATE TABLE IF NOT EXISTS funds_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_account_id TEXT NOT NULL, -- Bank ID or wallet ID for cash wallet
  source_account_type TEXT NOT NULL CHECK (source_account_type IN ('BANK', 'CASH_WALLET')),
  source_account_name TEXT NOT NULL, -- Bank name or 'Cash Wallet'
  amount NUMERIC NOT NULL,
  transaction_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  spent_table_id UUID, -- Reference to spent_table entry (optional)
  source TEXT NOT NULL CHECK (source IN ('SCAN_RECEIPT', 'MANUAL', 'IMPORT_EMAIL', 'IMPORT_SMS')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funds_out_transaction_datetime ON funds_out(transaction_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_funds_out_source_account_id ON funds_out(source_account_id);
CREATE INDEX IF NOT EXISTS idx_funds_out_source_account_type ON funds_out(source_account_type);
CREATE INDEX IF NOT EXISTS idx_funds_out_spent_table_id ON funds_out(spent_table_id);
CREATE INDEX IF NOT EXISTS idx_funds_out_created_at ON funds_out(created_at DESC);
COMMENT ON TABLE funds_out IS 'Records of funds deducted from accounts/wallet when spending occurs';


-- ==============================================
-- SUMMARY
-- ==============================================
-- Tables created:
-- ✓ wallet_snapshots - Current wallet state with denomination counts
-- ✓ banks - Bank account names and balances
-- ✓ bank_in - Deposits/transfers into bank accounts
-- ✓ wallet_in - Cash received with denomination breakdown
-- ✓ spent_table - Spending line items with transaction details
-- ✓ funds_out - Payments/withdrawals from accounts when spending occurs


