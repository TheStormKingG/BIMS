-- SPENT_TABLE - Track spending line items
-- Run this in your Supabase SQL Editor to create the spent_table

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

