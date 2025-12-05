-- Migration: Move wallet from wallet_snapshots to banks table
-- Run this in your Supabase SQL Editor

-- Step 1: Add wallet entry to banks table if it doesn't exist
-- Calculate total from latest wallet_snapshots entry if it exists, otherwise use 0
INSERT INTO banks (bank_name, total, updated)
SELECT 
  'Cash Wallet' as bank_name,
  COALESCE((
    SELECT 
      (note_5000 * 5000) + 
      (note_2000 * 2000) + 
      (note_1000 * 1000) + 
      (note_500 * 500) + 
      (note_100 * 100) + 
      (note_50 * 50) + 
      (note_20 * 20)
    FROM wallet_snapshots
    ORDER BY created_at DESC
    LIMIT 1
  ), 0) as total,
  NOW() as updated
WHERE NOT EXISTS (
  SELECT 1 FROM banks WHERE bank_name = 'Cash Wallet'
);

-- Step 2: Drop wallet_snapshots table (optional - uncomment if you want to delete it)
-- DROP TABLE IF EXISTS wallet_snapshots CASCADE;

-- Step 3: Drop wallet_in table (optional - uncomment if you want to delete it)
-- DROP TABLE IF EXISTS wallet_in CASCADE;

-- Note: Keep wallet_in table for now if you want to preserve transaction history
-- You can delete it later if not needed

