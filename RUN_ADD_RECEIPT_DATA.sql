-- ============================================================================
-- Add receipt_data JSONB column to store full digitized receipt data
-- ============================================================================
-- Run this SQL in your Supabase Dashboard SQL Editor
-- This allows storing the complete receipt scan result with all items

-- Add receipt_data JSONB column to store full digitized receipt information
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS receipt_data JSONB;

-- Add an index on receipt_data for faster queries
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_data ON receipts USING GIN (receipt_data);

