-- Migration: Setup MMG Payments Storage Bucket
-- This migration creates the storage bucket and policies for MMG payment screenshots

-- Create storage bucket (if it doesn't exist)
-- Note: Buckets are typically created via Supabase Dashboard or CLI
-- This SQL creates the policies, but the bucket itself must be created in the dashboard first
-- Run this in Supabase SQL Editor after creating the bucket manually

-- Storage Policies for mmg_payments bucket
-- Users can upload to their own request path for user_success only
CREATE POLICY "Users can upload user_success screenshots to their requests"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mmg_payments'
  AND (storage.foldername(name))[1]::text = 'user_success'
  AND EXISTS (
    SELECT 1 FROM mmg_payment_requests
    WHERE mmg_payment_requests.id::text = (storage.foldername(name))[2]::text
    AND mmg_payment_requests.user_id = auth.uid()
  )
);

-- Users can read their own uploaded screenshots
CREATE POLICY "Users can read their own payment screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mmg_payments'
  AND EXISTS (
    SELECT 1 FROM mmg_payment_requests
    WHERE mmg_payment_requests.id::text = (storage.foldername(name))[2]::text
    AND mmg_payment_requests.user_id = auth.uid()
  )
);

-- Admin can upload admin_received screenshots for any request
-- Note: This requires admin role check - adjust email check as needed
CREATE POLICY "Admins can upload admin_received screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mmg_payments'
  AND (storage.foldername(name))[1]::text = 'admin_received'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('stefan.gravesande@preqal.com', 'stefan.gravesande@gmail.com')
  )
);

-- Admin can read all payment screenshots
CREATE POLICY "Admins can read all payment screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mmg_payments'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('stefan.gravesande@preqal.com', 'stefan.gravesande@gmail.com')
  )
);

-- Note: COMMENT ON POLICY is not supported for storage.objects policies in Supabase
-- Storage policies are documented in MMG_STORAGE_SETUP.md

