# MMG Payment System Documentation

## Overview

The MMG (Mobile Money Guyana) payment system enables users to subscribe to Stashway plans using manual bank transfers via MMG. The workflow includes AI-powered receipt verification, admin approval, and automatic plan upgrades.

## Architecture

### Database Tables

1. **mmg_payment_requests**: Stores payment requests with unique reference codes
2. **mmg_payment_artifacts**: Stores references to uploaded payment screenshots
3. **mmg_payment_extractions**: Stores AI-extracted fields from screenshots
4. **mmg_payment_events**: Audit log for all payment-related events
5. **user_notifications**: User notifications including plan upgrade confirmations

### Edge Functions

1. **mmg-create-request**: Creates a new payment request with unique reference code
2. **mmg-parse-user-success**: Parses user-uploaded payment screenshot using AI
3. **mmg-parse-admin-received**: Parses admin-uploaded funds received screenshot and verifies payment

### Storage

- Bucket: `mmg_payments`
- Structure: `{request_id}/user_success/{timestamp}.png` and `{request_id}/admin_received/{timestamp}.png`

## Setup Instructions

### 1. Database Migrations

Run these migrations in order:

```bash
# In Supabase SQL Editor:
supabase/migrations/021_create_mmg_payment_system.sql
supabase/migrations/022_setup_mmg_storage_bucket.sql
```

### 2. Storage Bucket

See `MMG_STORAGE_SETUP.md` for detailed instructions on creating the storage bucket.

### 3. Edge Functions

Deploy the edge functions to Supabase:

```bash
# Using Supabase CLI
supabase functions deploy mmg-create-request
supabase functions deploy mmg-parse-user-success
supabase functions deploy mmg-parse-admin-received
```

**Environment Variables Required:**
- `GEMINI_API_KEY`: For AI image parsing
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `SITE_URL`: Your site URL (for email links)

### 4. Admin Configuration

Update admin emails in:
- `supabase/functions/mmg-parse-user-success/index.ts` (ADMIN_EMAILS constant)
- `supabase/functions/mmg-parse-admin-received/index.ts` (ADMIN_EMAILS constant)
- `components/AdminVerifyMMG.tsx` (ADMIN_EMAILS constant)
- Storage policies in `022_setup_mmg_storage_bucket.sql`

## User Flow

1. **User selects plan** on `/settings/pricing` → navigates to `/pay/mmg?plan={plan}`
2. **User clicks "Pay for Plan"** → Edge function generates unique reference code
3. **User copies payment message** → Message format: `STASHWAY {PLAN} PAYMENT - REF:{24-char-code}`
4. **User completes MMG transfer**:
   - Payee: `6335874`
   - Amount: Plan-specific (see `PLAN_PRICES` in `services/mmgPayments.ts`)
   - Message: Copied reference message
5. **User uploads success screenshot** → Stored in Supabase Storage
6. **AI parses screenshot** → Extracts transaction details
7. **Email sent to admins** → With verification link
8. **Admin verifies payment**:
   - Uploads funds received screenshot
   - AI extracts details
   - System compares with user upload
   - If verified, upgrades user plan
9. **User receives celebration** → Confetti + modal on next page load

## Admin Flow

1. **Admin receives email** → Contains verification link: `/admin/mmg/verify?request_id={id}`
2. **Admin opens verification page** → Views user upload and extracted data
3. **Admin uploads funds received screenshot** → Stored in storage
4. **System verifies payment**:
   - Reference code match
   - Amount match (within ±1 GYD)
   - Transaction ID match (if present)
   - Date/time within 48 hours
   - Request not expired
5. **If verified**:
   - Update `user_subscriptions` table
   - Create `user_notifications` entry
   - Create `user_celebrations` entry (triggers confetti on next load)
   - Log events

## Configuration

### Plan Prices

Update prices in `services/mmgPayments.ts`:

```typescript
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  none: 0,
  personal: 1881,    // $9 USD * 209 GYD/USD
  pro: 3762,         // $18 USD * 209 GYD/USD
  pro_max: 9405,     // $45 USD * 209 GYD/USD
};
```

### Payee Phone Number

Update in `services/mmgPayments.ts`:

```typescript
export const MMG_PAYEE_PHONE = '6335874';
```

### Reference Code Generation

- Format: 24 uppercase alphanumeric characters (no ambiguous chars: I, O, 0, 1)
- Unique per request
- Stored with corresponding secret (32+ char, server-side only)

## Security

- **Reference Secret**: Never exposed to client, only used server-side for verification
- **RLS Policies**: Users can only access their own payment requests
- **Admin Protection**: Admin routes check email whitelist
- **Storage Policies**: Users can only upload/read their own screenshots; admins can read all

## Error Handling

- AI parsing failures: Request status updated with error, admin can manually verify
- Upload failures: User can retry upload
- Verification failures: Request marked as rejected with error details, admin can manually override if needed

## Testing Checklist

- [ ] User can create payment request
- [ ] Reference code is unique and properly formatted
- [ ] User can upload payment screenshot
- [ ] AI extraction works correctly
- [ ] Admin receives email notification
- [ ] Admin can access verification page
- [ ] Admin can upload funds received screenshot
- [ ] Payment verification logic works correctly
- [ ] User plan upgrades automatically on verification
- [ ] User receives celebration modal on next page load
- [ ] Duplicate uploads are handled gracefully (idempotent)

## Troubleshooting

### Edge Functions Not Deploying

- Ensure Supabase CLI is installed and authenticated
- Check environment variables are set
- Verify function names match directory names

### AI Extraction Failing

- Verify `GEMINI_API_KEY` is set correctly
- Check API quota/limits
- Review extraction prompt for clarity
- Check screenshot quality (should be clear and readable)

### Storage Upload Failing

- Verify storage bucket exists and is properly configured
- Check RLS policies allow user uploads
- Verify file size is under 10MB limit

### Payment Verification Failing

- Check extracted reference code matches request reference code exactly
- Verify amounts match (allowing for small rounding differences)
- Check transaction dates are within 48-hour window
- Ensure request hasn't expired

## Future Enhancements

- Email service integration (Resend, SendGrid, etc.)
- Payment expiration notifications
- Payment retry mechanism
- Bulk verification for admins
- Payment analytics dashboard
- Webhook integration for real-time notifications

