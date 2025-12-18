-- Fix receipts table: Add unique constraint on spent_table_id to prevent duplicates
-- This ensures one receipt per transaction and allows upsert operations

-- First, handle any existing duplicates by keeping only the most recent one per spent_table_id
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT spent_table_id, COUNT(*) as cnt
        FROM receipts
        GROUP BY spent_table_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- If duplicates exist, keep only the most recent one per spent_table_id
    IF duplicate_count > 0 THEN
        DELETE FROM receipts
        WHERE id NOT IN (
            SELECT DISTINCT ON (spent_table_id) id
            FROM receipts
            ORDER BY spent_table_id, created_at DESC
        );
    END IF;
END $$;

-- Add unique constraint (will fail if duplicates still exist, but we just cleaned them)
ALTER TABLE receipts
DROP CONSTRAINT IF EXISTS receipts_spent_table_id_unique;

ALTER TABLE receipts
ADD CONSTRAINT receipts_spent_table_id_unique UNIQUE (spent_table_id);

