# Badge Credentials System - Testing Guide

## ✅ What's Been Completed

1. **Database Schema** - All tables and functions created
2. **Credential Generation** - Working with proper signatures
3. **Backfill System** - Successfully created credential for existing badge
4. **Verification Pages** - Ready to test

## 🧪 Testing Steps

### Step 1: Verify Your Credential

You now have a credential:
- **Credential Number**: `STW-2025-EFUKT4`
- **Badge**: The Explorer
- **Recipient**: Stefan Gravesande

**Test the verification page:**
1. Visit: `https://stashway.app/verify/STW-2025-EFUKT4`
   - Or if running locally: `http://localhost:3000/verify/STW-2025-EFUKT4`

2. **Expected Result:**
   - ✅ Shows "Verified" status
   - Displays badge name: "The Explorer"
   - Shows recipient name: "Stefan Gravesande"
   - Shows credential number
   - Shows issue date and criteria

### Step 2: Test Verification Search

1. Visit: `https://stashway.app/verify`
2. Enter credential number: `STW-2025-EFUKT4`
3. Click "Verify Credential"
4. Should redirect to verification result page

### Step 3: Test Goal Completion Flow

1. Complete a new system goal (one you haven't completed yet)
2. Check `badge_credentials` table
3. Should see a new credential automatically created
4. Verify the new credential using the verification page

### Step 4: Test Backfill (If Needed)

If you have other badges without credentials:
1. Go to Settings → Backfill Badge Credentials
2. Click "Backfill X Missing Credential(s)"
3. Check that credentials are created
4. Verify they work on the verification page

## 🎯 What Works Now

✅ **Credential Issuance** - Automatic when goals complete  
✅ **Backfill System** - Creates credentials for existing badges  
✅ **Public Verification** - Anyone can verify credentials via URL  
✅ **Database Security** - RLS policies and signatures in place  

## 📋 Next Steps (Optional Enhancements)

### High Priority
- [ ] **Share Modal UI** - Add "Share Badge" button to completed goals
- [ ] **Badge Card Image Generation** - Create downloadable PNG/SVG images
- [ ] **Social Sharing** - LinkedIn, WhatsApp, etc. integration

### Medium Priority
- [ ] **Credential History** - View all your credentials in one place
- [ ] **Badge Portfolio** - Display collection of earned badges
- [ ] **QR Code Generation** - Add QR codes to verification URLs

### Future Enhancements
- [ ] Move signature generation to Supabase Edge Function (better security)
- [ ] PDF certificate download
- [ ] Badge analytics (track shares, verifications)
- [ ] Blockchain-based verification (immutable records)

## 🐛 Troubleshooting

### Verification page shows "Not Verified"
- Check that credential_number format is correct: `STW-YYYY-XXXXXX`
- Verify RLS policies allow public access to verification function
- Check browser console for errors

### Credentials not being created on goal completion
- Check browser console for errors
- Verify `issueCredential` is being called in `goalEngine.ts`
- Check that environment variable `VITE_BADGE_SIGNING_SECRET` is set

### Backfill doesn't work
- Ensure migration `012_backfill_badge_credentials.sql` was run
- Check that `get_badges_needing_credentials()` function exists
- Verify you're authenticated when accessing Settings

## 🎉 Success Criteria

Your system is working correctly if:
1. ✅ Credentials are created when goals complete
2. ✅ Verification page shows "Verified" for valid credentials
3. ✅ Backfill creates credentials for existing badges
4. ✅ Credential numbers are unique and follow format `STW-YYYY-XXXXXX`

