# MMG Payments Storage Bucket Setup

## Prerequisites

1. Run migration `021_create_mmg_payment_system.sql` first
2. Run migration `022_setup_mmg_storage_bucket.sql` for storage policies

## Manual Steps Required

### 1. Create Storage Bucket

In Supabase Dashboard:

1. Go to **Storage** section
2. Click **New bucket**
3. Bucket name: `mmg_payments`
4. **Public bucket**: Unchecked (private)
5. **File size limit**: 10MB (recommended)
6. **Allowed MIME types**: `image/*` (optional, for validation)
7. Click **Create bucket**

### 2. Storage Structure

The bucket will store files in the following structure:

```
mmg_payments/
  {request_id}/
    user_success/
      {timestamp}.png
    admin_received/
      {timestamp}.png
```

Example:
```
mmg_payments/
  abc123-def456-ghi789/
    user_success/
      1703145600000.png
    admin_received/
      1703145700000.png
```

### 3. Storage Policies

The migration `022_setup_mmg_storage_bucket.sql` creates the following policies:

- **Users can upload** to `{request_id}/user_success/` for their own requests
- **Users can read** their own uploaded screenshots
- **Admins can upload** to `{request_id}/admin_received/` for any request
- **Admins can read** all payment screenshots

### 4. Admin Email Configuration

The storage policies check for admin emails:
- `stefan.gravesande@preqal.com`
- `stefan.gravesande@gmail.com`

To add more admins, update the policy conditions in `022_setup_mmg_storage_bucket.sql`.

### 5. Testing

After setup:

1. Create a test payment request
2. Upload a user screenshot
3. Verify it appears in Storage
4. As admin, verify you can read all screenshots

