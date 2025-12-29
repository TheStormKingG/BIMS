# Receipts Storage Setup Guide

This guide explains how to set up the receipts storage bucket in Supabase to enable receipt image storage and retrieval.

## Prerequisites

- Access to your Supabase project dashboard
- Admin access to run SQL migrations

## Steps to Set Up Receipts Storage

### 1. Create the Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name the bucket: `receipts`
5. Set the bucket to **Private** (not public)
6. Click **Create bucket**

### 2. Apply RLS Policies

1. Go to **SQL Editor** in the Supabase Dashboard
2. Open the migration file: `supabase/migrations/023_setup_receipts_storage_bucket.sql`
3. Copy the entire SQL content
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

Alternatively, you can run this SQL directly:

```sql
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can upload receipts to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read receipts from their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete receipts from their own folder" ON storage.objects;

-- Policy: Users can upload receipt images to their own folder
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
```

### 3. Verify Setup

To verify the policies were created successfully:

1. Go to **Storage** > **Policies**
2. Filter by bucket: `receipts`
3. You should see three policies:
   - "Users can upload receipts to their own folder" (INSERT)
   - "Users can read receipts from their own folder" (SELECT)
   - "Users can delete receipts from their own folder" (DELETE)

## How It Works

- Receipts are stored with the path pattern: `userId/timestamp-randomUUID.extension`
- The RLS policies ensure users can only:
  - Upload receipts to their own folder (where folder name = their user ID)
  - Read/download receipts from their own folder
  - Delete receipts from their own folder

## Troubleshooting

### Error: "new row violates row-level security policy"

This error occurs when:
1. The storage bucket RLS policies haven't been applied
2. The bucket doesn't exist
3. The user doesn't have proper authentication

**Solution:**
1. Verify the `receipts` bucket exists in Storage
2. Run the migration SQL in the SQL Editor
3. Verify the policies were created in Storage > Policies
4. Ensure the user is properly authenticated

### Error: "Bucket not found"

This error occurs when the `receipts` bucket hasn't been created.

**Solution:**
1. Create the bucket in Storage (see Step 1 above)
2. Ensure it's named exactly `receipts` (case-sensitive)

## Path Structure

Receipt images are stored with the following structure:
```
receipts/
  └── {userId}/
      ├── {timestamp}-{uuid}.jpg
      ├── {timestamp}-{uuid}.png
      └── ...
```

Example:
```
receipts/
  └── 214458f9-60ca-4e6d-a142-0cee1941ccd5/
      └── 1766598448000-a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
```

