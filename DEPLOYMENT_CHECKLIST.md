# Deployment & Testing Checklist

## ✅ Completed & Ready to Test

### Core Infrastructure
- [x] Database schema (`badge_credentials`, `badge_credential_events`)
- [x] Credential number generation (STW-YYYY-XXXXXX format)
- [x] HMAC-SHA256 signature system
- [x] Credential issuance (automatic on goal completion)
- [x] Public verification page (`/verify/:credential_number`)
- [x] Verification search page (`/verify`)
- [x] RLS policies and security
- [x] Audit logging
- [x] Environment variables setup

### What Works Right Now
1. **Goal Completion** → Automatically issues credential
2. **Verification** → Public verification page works
3. **Database** → All tables and functions ready

---

## ⏳ Pending (Not Blocking Basic Testing)

### Share Functionality
- [ ] Share modal component
- [ ] Badge card image generation (PNG/SVG)
- [ ] Social sharing buttons (LinkedIn, WhatsApp, etc.)
- [ ] "Share Badge" button in UI

**Note:** These are nice-to-have features. The core system (issuance + verification) works without them.

---

## 🚀 Ready to Deploy & Test?

### YES - You can deploy and test the core functionality!

**What you can test:**
1. Complete a system goal → Credential is automatically created
2. Visit `/verify/{credential_number}` → See verification page
3. Share the verification URL manually → Others can verify

**What you CAN'T do yet:**
- Click "Share Badge" button (doesn't exist yet)
- Download badge image
- Share to social media via UI

---

## Pre-Deployment Steps

### 1. Run Database Migrations
```sql
-- Run in Supabase SQL Editor (in order):
1. 009_user_events_and_celebrations.sql
2. 010_badge_credentials_system.sql
3. 011_production_badge_credentials_fix.sql (fixes any policy errors)
```

### 2. Verify Environment Variables
Check your `.env` file has:
```env
VITE_BADGE_SIGNING_SECRET=your-secret-here
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
VITE_GEMINI_API_KEY=your-key
```

### 3. Build & Deploy
```bash
npm run build
# Then deploy dist/ folder to your hosting
```

### 4. Test Flow
1. Log into app
2. Complete "Welcome to Stashway" goal (view overview page)
3. Check database: `SELECT credential_number FROM badge_credentials ORDER BY issued_at DESC LIMIT 1;`
4. Visit: `https://stashway.app/verify/{credential_number}`
5. Should show "✅ Verified"

---

## Recommendation

**Deploy now and test core functionality**, then add share features later. The verification system is the most important part and it's ready!

