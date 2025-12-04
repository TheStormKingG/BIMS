# Supabase Setup Guide for Stashway

This guide will help you set up Supabase for your Stashway app.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: Stashway (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to you
5. Click **"Create new project"** (this may take a few minutes)

## Step 2: Run the Database Schema

1. Once your project is ready, go to the **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

This creates:
- `accounts` table (for banks and cash wallet)
- `transactions` table (for all transactions)
- Indexes for performance
- Row Level Security (RLS) policies
- Auto-update triggers

## Step 3: Get Your API Credentials

1. Go to **Settings** → **API** in the left sidebar
2. You'll need two values:

   **Project URL**
   ```
   Example: https://abcdefghijk.supabase.co
   ```

   **Anon/Public Key** (under "Project API keys")
   ```
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Copy both of these - you'll need them next!

## Step 4: Set GitHub Secrets (For Deployment)

To deploy your app with Supabase credentials:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** for each:

   - **Name**: `SUPABASE_URL`
     **Value**: Your Project URL from Step 3

   - **Name**: `SUPABASE_ANON_KEY`
     **Value**: Your Anon/Public Key from Step 3

Or use the GitHub CLI:

```powershell
# Run these commands in your project directory:
gh secret set SUPABASE_URL
# Paste your URL when prompted

gh secret set SUPABASE_ANON_KEY
# Paste your anon key when prompted
```

## Step 5: Deploy

Once the secrets are set, just push your changes:

```bash
git add .
git commit -m "Add Supabase integration"
git push
```

The app will automatically build and deploy with Supabase connected!

## Optional: Enable Authentication

If you want users to sign up and log in (recommended for multi-user):

1. Go to **Authentication** → **Providers** in Supabase
2. Enable **Email** (or other providers like Google, GitHub)
3. Configure settings as needed

The database is already set up with Row Level Security (RLS) to support multi-user authentication.

## Testing Locally

To test locally without GitHub secrets:

1. Create a `.env` file in your project root:

```env
GEMINI_API_KEY=your_gemini_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

2. Run the dev server:

```bash
npm run dev
```

The app will use these environment variables automatically.

## Troubleshooting

**Issue**: "Supabase URL not configured" prompt appears

**Solution**: Make sure your GitHub secrets are set correctly, or enter credentials when prompted. They'll be saved in localStorage for future use.

**Issue**: "Permission denied" errors

**Solution**: Check that the SQL schema was run successfully. Go to **Table Editor** in Supabase and verify the `accounts` and `transactions` tables exist.

**Issue**: Can't see data

**Solution**: Row Level Security (RLS) is enabled. For anonymous usage (without auth), the policies allow access when `user_id IS NULL`. If using auth, make sure users are logged in.

## Support

Need help? Check:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Quickstart](https://supabase.com/docs/guides/getting-started)

