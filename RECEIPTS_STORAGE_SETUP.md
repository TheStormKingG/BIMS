# Receipts Storage Setup Instructions

## Issue
If you're seeing the error "new row violates row-level security policy" when trying to view receipts, the storage bucket RLS policies haven't been applied yet.

## Solution

1. **Ensure the 'receipts' bucket exists in Supabase:**
   - Go to your Supabase Dashboard
   - Navigate to Storage
   - If the 'receipts' bucket doesn't exist, create it:
     - Click "New bucket"
     - Name: `receipts`
     - Make it **Private** (not public)
     - Click "Create bucket"

2. **Apply the RLS policies:**
   - Go to SQL Editor in Supabase Dashboard
   - Open the file: `supabase/migrations/023_setup_receipts_storage_bucket.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" to execute the migration

3. **Verify the policies were created:**
   - Go to Storage > receipts bucket > Policies
   - You should see 3 policies:
     - "Users can upload receipts to their own folder" (INSERT)
     - "Users can read receipts from their own folder" (SELECT)
     - "Users can delete receipts from their own folder" (DELETE)

## How it works

Receipts are stored with the path pattern: `{userId}/{timestamp}-{randomId}.{extension}`

The RLS policies ensure users can only:
- Upload receipts to their own folder (`userId/...`)
- Read/download receipts from their own folder
- Delete receipts from their own folder

This ensures users can only access their own receipt images.

## Testing

After applying the migration, try viewing a receipt in the Spending page. The error should be resolved and the receipt image should display correctly.

