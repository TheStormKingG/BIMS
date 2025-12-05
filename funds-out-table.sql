-- FUNDS_OUT TABLE - Track payments/withdrawals from accounts
-- Run this in your Supabase SQL Editor to create the funds_out table

CREATE TABLE IF NOT EXISTS funds_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_account_id TEXT NOT NULL, -- Bank ID or 'wallet' for cash wallet
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

