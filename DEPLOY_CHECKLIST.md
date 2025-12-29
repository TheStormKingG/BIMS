# Deploy gemini-scan-receipt Function Checklist

## Current Issue
CORS error: "Response to preflight request doesn't pass access control check: It does not have HTTP ok status"

This happens because the function is not deployed yet.

## Steps to Fix

### 1. Install/Login to Supabase CLI (if not done)
```bash
npm install -g supabase
supabase login
```

### 2. Link to Your Project
```bash
supabase link --project-ref rtygzyaixmyytvllbicb
```

### 3. Create/Get New Gemini API Key
1. Go to https://aistudio.google.com/apikey
2. Create a new API key (the old one was leaked and disabled)
3. Copy the key

### 4. Set the API Key Secret
```bash
supabase secrets set GEMINI_API_KEY=your_new_gemini_api_key_here
```

### 5. Deploy the Function
```bash
supabase functions deploy gemini-scan-receipt
```

### 6. Verify Deployment
After deployment, check:
- The function appears in Supabase Dashboard → Edge Functions
- No errors in the deployment output
- Test by trying to scan a receipt in the app

## Expected Result
After deployment, the CORS error should be gone and receipt scanning should work.

## Troubleshooting

**If deployment fails:**
- Make sure you're in the project root directory
- Check that `supabase/functions/gemini-scan-receipt/index.ts` exists
- Verify you're logged in: `supabase projects list`

**If CORS error persists after deployment:**
- Wait 30 seconds for the deployment to propagate
- Hard refresh the browser (Ctrl+Shift+R)
- Check the function logs in Supabase Dashboard

**If you get "Service configuration error":**
- Verify the secret is set: `supabase secrets list`
- Make sure the secret name is exactly `GEMINI_API_KEY` (case-sensitive)

