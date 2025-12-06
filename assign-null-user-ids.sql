-- SQL Script to Assign NULL user_id Records to Correct Users
-- This script assigns records with NULL user_id to the appropriate user
-- 
-- IMPORTANT: Review and modify the user_id values below before running!
-- You can find user IDs in the auth.users table

-- Step 1: View all records with NULL user_id to understand what needs to be assigned
-- ================================================================================

-- Check banks with NULL user_id
SELECT 
  'banks' as table_name,
  id,
  bank_name,
  total,
  updated,
  user_id
FROM banks
WHERE user_id IS NULL
ORDER BY updated DESC;

-- Check funds_in with NULL user_id
SELECT 
  'funds_in' as table_name,
  id,
  datetime,
  source,
  amount,
  destination_account_id,
  user_id
FROM funds_in
WHERE user_id IS NULL
ORDER BY datetime DESC;

-- Check funds_out with NULL user_id
SELECT 
  'funds_out' as table_name,
  id,
  source_account_id,
  source_account_type,
  amount,
  transaction_datetime,
  user_id
FROM funds_out
WHERE user_id IS NULL
ORDER BY transaction_datetime DESC;

-- Check spent_table with NULL user_id
SELECT 
  'spent_table' as table_name,
  id,
  item,
  item_total,
  transaction_datetime,
  user_id
FROM spent_table
WHERE user_id IS NULL
ORDER BY transaction_datetime DESC;

-- Step 2: Get list of users to help determine which user_id to use
-- =================================================================
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at ASC;

-- Step 3: Assign NULL user_id records to a specific user
-- =======================================================
-- 
-- OPTION A: Assign all NULL records to the FIRST user (oldest account)
-- Uncomment and modify the user_id below:
/*
UPDATE banks
SET user_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
WHERE user_id IS NULL;

UPDATE funds_in
SET user_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
WHERE user_id IS NULL;

UPDATE funds_out
SET user_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
WHERE user_id IS NULL;

UPDATE spent_table
SET user_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
WHERE user_id IS NULL;
*/

-- OPTION B: Assign all NULL records to a SPECIFIC user_id
-- Replace 'YOUR_USER_ID_HERE' with the actual user UUID from auth.users
-- Uncomment and modify the user_id below:
/*
UPDATE banks
SET user_id = 'YOUR_USER_ID_HERE'::uuid
WHERE user_id IS NULL;

UPDATE funds_in
SET user_id = 'YOUR_USER_ID_HERE'::uuid
WHERE user_id IS NULL;

UPDATE funds_out
SET user_id = 'YOUR_USER_ID_HERE'::uuid
WHERE user_id IS NULL;

UPDATE spent_table
SET user_id = 'YOUR_USER_ID_HERE'::uuid
WHERE user_id IS NULL;
*/

-- OPTION C: Smart assignment based on transaction relationships
-- This assigns records to users based on related transactions that have user_id
-- Uncomment to use:
/*
-- Assign banks based on funds_in transactions
UPDATE banks b
SET user_id = (
  SELECT DISTINCT fi.user_id
  FROM funds_in fi
  WHERE fi.destination_account_id = b.id
    AND fi.user_id IS NOT NULL
  LIMIT 1
)
WHERE b.user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM funds_in fi
    WHERE fi.destination_account_id = b.id
      AND fi.user_id IS NOT NULL
  );

-- Assign funds_in based on destination bank's user_id
UPDATE funds_in fi
SET user_id = (
  SELECT b.user_id
  FROM banks b
  WHERE b.id = fi.destination_account_id
    AND b.user_id IS NOT NULL
  LIMIT 1
)
WHERE fi.user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM banks b
    WHERE b.id = fi.destination_account_id
      AND b.user_id IS NOT NULL
  );

-- Assign funds_out based on source bank's user_id
UPDATE funds_out fo
SET user_id = (
  SELECT b.user_id
  FROM banks b
  WHERE b.id = fo.source_account_id
    AND b.user_id IS NOT NULL
  LIMIT 1
)
WHERE fo.user_id IS NULL
  AND fo.source_account_type = 'BANK'
  AND EXISTS (
    SELECT 1 FROM banks b
    WHERE b.id = fo.source_account_id
      AND b.user_id IS NOT NULL
  );

-- Assign spent_table based on related funds_out user_id
UPDATE spent_table st
SET user_id = (
  SELECT DISTINCT fo.user_id
  FROM funds_out fo
  WHERE fo.spent_table_id = st.id
    AND fo.user_id IS NOT NULL
  LIMIT 1
)
WHERE st.user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM funds_out fo
    WHERE fo.spent_table_id = st.id
      AND fo.user_id IS NOT NULL
  );

-- For any remaining NULL records, assign to first user
UPDATE banks
SET user_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
WHERE user_id IS NULL;

UPDATE funds_in
SET user_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
WHERE user_id IS NULL;

UPDATE funds_out
SET user_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
WHERE user_id IS NULL;

UPDATE spent_table
SET user_id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
WHERE user_id IS NULL;
*/

-- Step 4: Verify the assignments
-- ===============================
-- Run these queries after the UPDATE statements to verify:

SELECT 
  'banks' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_with_null_user_id
FROM banks
UNION ALL
SELECT 
  'funds_in' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_with_null_user_id
FROM funds_in
UNION ALL
SELECT 
  'funds_out' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_with_null_user_id
FROM funds_out
UNION ALL
SELECT 
  'spent_table' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(*) - COUNT(user_id) as records_with_null_user_id
FROM spent_table;

-- View all records by user to verify assignments
SELECT 
  u.email,
  COUNT(DISTINCT b.id) as bank_count,
  COUNT(DISTINCT fi.id) as funds_in_count,
  COUNT(DISTINCT fo.id) as funds_out_count,
  COUNT(DISTINCT st.id) as spent_table_count
FROM auth.users u
LEFT JOIN banks b ON b.user_id = u.id
LEFT JOIN funds_in fi ON fi.user_id = u.id
LEFT JOIN funds_out fo ON fo.user_id = u.id
LEFT JOIN spent_table st ON st.user_id = u.id
GROUP BY u.id, u.email
ORDER BY u.created_at ASC;

