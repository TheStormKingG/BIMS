-- Migration: Cleanup Duplicate Cash Wallets
-- This migration consolidates duplicate Cash Wallet entries per user into a single wallet
-- Strategy: For each user, keep the wallet with the highest balance (or most recent if balances are equal)
-- Merge all balances into the kept wallet, then delete the duplicates

-- Step 1: For each user with multiple Cash Wallets, find the one to keep
-- We'll keep the one with the highest balance, or if balances are equal, the most recent one
WITH wallets_to_keep AS (
  SELECT DISTINCT ON (user_id)
    id,
    user_id,
    total,
    updated
  FROM banks
  WHERE bank_name = 'Cash Wallet'
    AND user_id IS NOT NULL
  ORDER BY user_id, total DESC, updated DESC
),
wallets_to_delete AS (
  SELECT 
    b.id,
    b.user_id,
    b.total,
    w.id AS keep_id
  FROM banks b
  INNER JOIN wallets_to_keep w ON b.user_id = w.user_id
  WHERE b.bank_name = 'Cash Wallet'
    AND b.user_id IS NOT NULL
    AND b.id != w.id
),
-- Step 2: Sum up all balances for each user's duplicate wallets
balance_totals AS (
  SELECT 
    user_id,
    keep_id,
    SUM(total) AS total_balance
  FROM wallets_to_delete
  GROUP BY user_id, keep_id
)
-- Step 3: Update the kept wallet with the merged balance
UPDATE banks
SET 
  total = banks.total + COALESCE(bt.total_balance, 0),
  updated = NOW()
FROM balance_totals bt
WHERE banks.id = bt.keep_id
  AND banks.bank_name = 'Cash Wallet';

-- Step 4: Delete duplicate wallets (but keep the one we're using)
WITH wallets_to_keep AS (
  SELECT DISTINCT ON (user_id)
    id,
    user_id
  FROM banks
  WHERE bank_name = 'Cash Wallet'
    AND user_id IS NOT NULL
  ORDER BY user_id, total DESC, updated DESC
)
DELETE FROM banks
WHERE bank_name = 'Cash Wallet'
  AND user_id IS NOT NULL
  AND id NOT IN (SELECT id FROM wallets_to_keep);

-- Step 5: Handle Cash Wallets with NULL user_id (shouldn't exist in production, but clean up if they do)
-- Keep only the one with highest balance/most recent
WITH null_user_wallet_to_keep AS (
  SELECT id
  FROM banks
  WHERE bank_name = 'Cash Wallet'
    AND user_id IS NULL
  ORDER BY total DESC, updated DESC
  LIMIT 1
)
DELETE FROM banks
WHERE bank_name = 'Cash Wallet'
  AND user_id IS NULL
  AND id NOT IN (SELECT id FROM null_user_wallet_to_keep);

-- Step 6: Create a unique partial index to prevent future duplicates
-- This ensures one Cash Wallet per user_id
-- First, drop the index if it exists
DROP INDEX IF EXISTS idx_unique_cash_wallet_per_user;

-- Create a unique partial index: one Cash Wallet per user
-- This works by creating a unique index only on rows where bank_name = 'Cash Wallet'
CREATE UNIQUE INDEX idx_unique_cash_wallet_per_user 
ON banks (user_id) 
WHERE bank_name = 'Cash Wallet' AND user_id IS NOT NULL;

-- For NULL user_id, we'll handle it separately with a separate constraint
-- (in practice, NULL user_id shouldn't exist in production, but we'll handle it)
CREATE UNIQUE INDEX idx_unique_cash_wallet_null_user 
ON banks (id) 
WHERE bank_name = 'Cash Wallet' AND user_id IS NULL;

