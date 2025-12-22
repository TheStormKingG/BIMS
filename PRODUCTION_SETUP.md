# Production Setup Guide for Badge Credentials System

This guide will walk you through setting up the badge credentials system for production.

## Step 1: Run Database Migrations

### Option A: Run Migrations in Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run Migration 009** (if not already run)
   - Open file: `supabase/migrations/009_user_events_and_celebrations.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)

3. **Run Migration 010** (Badge Credentials)
   - Open file: `supabase/migrations/010_badge_credentials_system.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"

4. **Run Migration 011** (Production Fix - handles existing policies)
   - Open file: `supabase/migrations/011_production_badge_credentials_fix.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"

5. **Run Migration 013** (Fix Badge Credentials RLS)
   - Open file: `supabase/migrations/013_fix_badge_credentials_rls.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"

6. **Run Migration 014** (Phase Certificates Support - REQUIRED for Phase Certificates)
   - Open file: `supabase/migrations/014_allow_null_goal_id_for_phase_certificates.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"
   - **This adds the `phase_number` column to `badge_credentials`**

7. **Run Migration 015** (Phase Celebrations Support - REQUIRED for Phase Certificates)
   - Open file: `supabase/migrations/015_add_phase_celebrations.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click "Run"
   - **This adds phase certificate support to `user_celebrations`**

### Option B: If you see "policy already exists" errors

If you encounter errors about policies already existing, run migration 011 which will:
- Drop existing policies safely
- Recreate them correctly
- Ensure all functions and triggers are set up

## Step 2: Set Environment Variable for Signing Secret

**Important for Production Security:**

1. **Generate a Strong Secret**
   - Use a cryptographically random string (32+ characters)
   - You can generate one using: `openssl rand -hex 32`
   - Or use: https://randomkeygen.com/

2. **Set in Vite Environment**
   - Create/update `.env` file in your project root
   - Add: `VITE_BADGE_SIGNING_SECRET=your-very-long-random-secret-here`
   - **Never commit this to git!** (should already be in `.gitignore`)

3. **For Production Deployment**
   - Add the environment variable to your hosting platform:
     - **Vercel**: Project Settings → Environment Variables
     - **Netlify**: Site Settings → Build & Deploy → Environment Variables
     - **Other**: Check your hosting provider's docs

## Step 3: Verify Database Setup

Run this SQL query in Supabase to verify everything is set up:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('badge_credentials', 'badge_credential_events', 'user_events', 'user_celebrations');

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('badge_credentials', 'badge_credential_events', 'user_events', 'user_celebrations');

-- Check function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'verify_badge_credential';
```

All should return results.

## Step 4: Test the System

1. **Complete a Goal**
   - Log into your app
   - Complete a system goal (e.g., "Welcome to Stashway")
   - Check that a credential is created

2. **Verify Credential Creation**
   ```sql
   SELECT credential_number, badge_name, recipient_display_name, status
   FROM badge_credentials
   ORDER BY issued_at DESC
   LIMIT 5;
   ```

3. **Test Verification Page**
   - Copy a credential number from the query above
   - Visit: `https://stashway.app/verify/{credential_number}`
   - Should show "Verified" status

## Step 5: Production Security Checklist

- [ ] Strong `VITE_BADGE_SIGNING_SECRET` set (32+ random characters)
- [ ] Secret is NOT in git repository
- [ ] Environment variable set in hosting platform
- [ ] RLS policies are enabled on all tables
- [ ] Verification function is accessible to `anon` role
- [ ] Test that credentials are being issued correctly
- [ ] Test that verification page works publicly (without login)

## Step 6: Optional - Move Signing to Edge Function (Future Enhancement)

For maximum security, consider moving signature generation to a Supabase Edge Function:

1. Create edge function: `supabase/functions/sign-credential`
2. Store signing secret in Supabase secrets
3. Update `credentialService.ts` to call edge function instead of client-side signing

This prevents the secret from being exposed to the client.

## Troubleshooting

### Error: "policy already exists"
- Run migration 011 which handles this gracefully

### Error: "function verify_badge_credential does not exist"
- Run migration 010 or 011 to create the function

### Credentials not being issued
- Check browser console for errors
- Verify goal completion is triggering
- Check `user_goal_progress` table to see if goals are being completed

### Verification page shows "Not Verified"
- Check that credential_number format is correct: `STW-YYYY-XXXXXX`
- Verify RLS policies allow public access to verification function
- Check browser console for errors

