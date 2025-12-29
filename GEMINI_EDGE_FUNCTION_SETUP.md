# Gemini Edge Function Setup Instructions

## Overview
Receipt scanning now uses a secure server-side approach via Supabase Edge Functions. The Gemini API key is stored securely in Supabase secrets and never exposed to the client.

## Steps to Setup

### 1. Create a New Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key (the old one was leaked and disabled)
3. **IMPORTANT**: Restrict the key immediately:
   - **Application restrictions**: None (for server-side use) OR HTTP referrers: `https://stashway.app/*`
   - **API restrictions**: Only allow "Generative Language API"

### 2. Deploy the Edge Function

The edge function code is in `supabase/functions/gemini-scan-receipt/index.ts`

To deploy it, use the Supabase CLI:

```bash
# Make sure you have Supabase CLI installed and logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy gemini-scan-receipt
```

Or use the Supabase Dashboard:
1. Go to Edge Functions in your Supabase Dashboard
2. Create a new function named `gemini-scan-receipt`
3. Copy the contents of `supabase/functions/gemini-scan-receipt/index.ts`
4. Deploy the function

### 3. Set the Gemini API Key Secret

**Using Supabase CLI:**
```bash
supabase secrets set GEMINI_API_KEY=your_new_api_key_here
```

**Using Supabase Dashboard:**
1. Go to Project Settings → Edge Functions → Secrets
2. Add a new secret:
   - Name: `GEMINI_API_KEY`
   - Value: Your new Gemini API key
3. Save

### 4. Verify the Setup

1. The edge function should be accessible at: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/gemini-scan-receipt`
2. Test receipt scanning in the app - it should work without any client-side API key

## Security Notes

✅ **What's Secure Now:**
- API key is stored server-side only
- API key is never exposed to the client
- All requests require user authentication
- Edge function validates user JWT tokens

❌ **What Was Removed:**
- API key from localStorage
- API key from environment variables (VITE_*)
- API key from client-side code
- Direct Gemini API calls from the browser

## Architecture

```
Client (Browser)
  ↓ (Authenticated Request with JWT)
Supabase Edge Function (gemini-scan-receipt)
  ↓ (Uses Secret GEMINI_API_KEY)
Google Gemini API
  ↓ (Returns JSON)
Edge Function
  ↓ (Returns ReceiptScanResult)
Client
```

## Troubleshooting

**Error: "Service configuration error"**
- Check that `GEMINI_API_KEY` secret is set in Supabase
- Verify the secret name is exactly `GEMINI_API_KEY`

**Error: "Unauthorized"**
- Ensure the user is logged in
- Check that the JWT token is being sent correctly

**Error: "Failed to scan receipt"**
- Check Edge Function logs in Supabase Dashboard
- Verify the Gemini API key is valid and has proper restrictions
- Check that the API key has access to "Generative Language API"

## Old Key Cleanup

Since the old key was leaked:
1. ✅ The old key is removed from client code
2. ⚠️ Search your git history and remove it from commits (if it was committed)
3. ✅ The new key is stored only in Supabase secrets (server-side)

