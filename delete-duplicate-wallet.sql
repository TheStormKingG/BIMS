-- Delete duplicate Cash Wallet entries from banks table
-- This keeps the one with the highest balance (or most recent if balances are equal)

-- First, let's see what we have
SELECT id, bank_name, total, updated, created_at
FROM banks
WHERE bank_name = 'Cash Wallet'
ORDER BY total DESC, updated DESC;

-- Delete duplicates, keeping only the one with the highest balance
-- If balances are equal, keep the most recently updated one
DELETE FROM banks
WHERE bank_name = 'Cash Wallet'
AND id NOT IN (
  SELECT id
  FROM (
    SELECT id
    FROM banks
    WHERE bank_name = 'Cash Wallet'
    ORDER BY total DESC, updated DESC
    LIMIT 1
  ) AS keep_this_one
);

-- Verify only one Cash Wallet remains
SELECT id, bank_name, total, updated
FROM banks
WHERE bank_name = 'Cash Wallet';

