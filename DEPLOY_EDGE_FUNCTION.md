# Deploy Gemini Scan Receipt Edge Function

## Issue
You're getting a CORS error because the edge function hasn't been deployed yet.

## Quick Deploy Steps

### Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref rtygzyaixmyytvllbicb
   ```

4. **Deploy the function**:
   ```bash
   supabase functions deploy gemini-scan-receipt
   ```

5. **Set the Gemini API key secret**:
   ```bash
   supabase secrets set GEMINI_API_KEY=your_new_gemini_api_key_here
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** in the left sidebar
4. Click **"Create a new function"**
5. Name it: `gemini-scan-receipt`
6. Copy the contents of `supabase/functions/gemini-scan-receipt/index.ts`
7. Paste into the function editor
8. Click **"Deploy"**

### Set the API Key Secret (Dashboard Method)

1. In Supabase Dashboard, go to **Project Settings** → **Edge Functions**
2. Scroll to **Secrets**
3. Click **"Add new secret"**
4. Name: `GEMINI_API_KEY`
5. Value: Your new Gemini API key
6. Click **"Save"**

## Verify Deployment

After deploying, the function should be available at:
```
https://rtygzyaixmyytvllbicb.supabase.co/functions/v1/gemini-scan-receipt
```

You can test it in the app by trying to scan a receipt - the CORS error should be gone.

## Troubleshooting

**If you get "Function not found" errors:**
- Make sure the function name is exactly `gemini-scan-receipt` (case-sensitive)
- Check that it was deployed successfully in the Edge Functions list

**If you get "Service configuration error":**
- Make sure you set the `GEMINI_API_KEY` secret
- Check that the secret name is exactly `GEMINI_API_KEY` (case-sensitive)

**If CORS errors persist:**
- The function should handle CORS automatically
- Try clearing your browser cache and hard refresh (Ctrl+Shift+R)

