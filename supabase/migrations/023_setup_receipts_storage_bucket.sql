-- Migration: Setup Receipts Storage Bucket RLS Policies
-- This migration creates storage policies for the receipts bucket
-- Note: The bucket itself must be created in Supabase Dashboard first
-- Run this in Supabase SQL Editor after creating the 'receipts' bucket manually

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
  AND (storage.foldername(name))[1]::text = auth.uid()::text
);

-- Policy: Users can read (including create signed URLs) receipt images from their own folder
CREATE POLICY "Users can read receipts from their own folder"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1]::text = auth.uid()::text
);

-- Policy: Users can delete receipt images from their own folder
CREATE POLICY "Users can delete receipts from their own folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1]::text = auth.uid()::text
);

-- Note: COMMENT ON POLICY is not supported for storage.objects policies in Supabase

