# Deploy MMG Payment Edge Functions

## Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Find your project ref in Supabase Dashboard → Settings → API)

## Deploy Functions

Deploy all three edge functions:

```bash
# Deploy payment request creation function
supabase functions deploy mmg-create-request

# Deploy user screenshot parsing function
supabase functions deploy mmg-parse-user-success

# Deploy admin verification function
supabase functions deploy mmg-parse-admin-received
```

## Set Environment Variables

After deploying, set the required environment variables in Supabase Dashboard:

1. Go to **Edge Functions** → Select function → **Settings** → **Environment Variables**

2. For each function, set:
   - `GEMINI_API_KEY`: Your Gemini API key for AI parsing
   - `SUPABASE_URL`: Your Supabase project URL (usually auto-set)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (find in Settings → API)
   - `SITE_URL`: Your site URL (e.g., `https://stashway.app`)

## Verify Deployment

After deploying, test the functions:

1. Check function logs:
   ```bash
   supabase functions logs mmg-create-request
   ```

2. Test via Supabase Dashboard → Edge Functions → Function → Test

## Troubleshooting CORS Issues

If you're getting CORS errors:

1. **Check function is deployed**: Ensure all functions are deployed and show as "Active" in the dashboard

2. **Verify CORS headers**: The functions include CORS headers in the code. If issues persist, you may need to:
   - Check Supabase project settings for CORS configuration
   - Ensure the function URL is correct
   - Verify the function is responding to OPTIONS requests

3. **Check function logs**: Review logs for any errors:
   ```bash
   supabase functions logs mmg-create-request --tail
   ```

## Alternative: Manual Deployment via Dashboard

If CLI doesn't work, you can manually create functions via Supabase Dashboard:

1. Go to **Edge Functions** → **New Function**
2. Name: `mmg-create-request`
3. Copy the code from `supabase/functions/mmg-create-request/index.ts`
4. Set environment variables
5. Deploy

Repeat for the other two functions.

