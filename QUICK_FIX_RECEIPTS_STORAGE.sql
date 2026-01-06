-- QUICK FIX: Run this SQL in Supabase SQL Editor to fix receipts storage access
-- Copy and paste this entire file into Supabase Dashboard > SQL Editor > New Query

-- First, verify the receipts bucket exists (this won't create it, just check)
-- If the bucket doesn't exist, create it in Storage > New Bucket > Name: "receipts" > Private

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload receipts to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read receipts from their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete receipts from their own folder" ON storage.objects;

-- Policy: Users can upload receipt images to their own folder
-- Receipts are stored with path pattern: userId/timestamp-randomUUID.extension
CREATE POLICY "Users can upload receipts to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can read (including create signed URLs) receipt images from their own folder
CREATE POLICY "Users can read receipts from their own folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can delete receipt images from their own folder
CREATE POLICY "Users can delete receipts from their own folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Verify policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%receipt%';


