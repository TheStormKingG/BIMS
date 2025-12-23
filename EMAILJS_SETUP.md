# EmailJS Setup for MMG Payment Notifications

This document explains how to set up EmailJS for sending email notifications when users upload MMG payment screenshots.

## Step 1: Install Dependencies

EmailJS is already installed. The package used is `@emailjs/browser`.

## Step 2: Create EmailJS Account and Service

1. Go to [EmailJS](https://www.emailjs.com/) and create an account
2. Create a new email service:
   - Service ID: `stashway_mmg_service`
   - Choose your email provider (Gmail, Outlook, etc.)

## Step 3: Create Email Template

1. Go to Email Templates in your EmailJS dashboard
2. Create a new template with ID: `mmg_user_upload`
3. Configure the template with the following variables:

### Template Variables:
- `to_email` - Comma-separated recipient emails
- `user_email` - User's email address
- `plan` - Selected plan name (Personal, Pro, Pro Max)
- `amount` - Amount expected (formatted as "GYD X,XXX")
- `reference_message` - Full payment reference message with 24-char code
- `request_id` - Payment request ID
- `uploaded_at` - Upload timestamp (ISO format)

### Email Template Options:

#### Option 1: HTML Template (Recommended - Beautiful & Professional)

1. In EmailJS dashboard, select "HTML" as the content type
2. Copy and paste the HTML from `EMAILJS_TEMPLATE_HTML.html` file in this repository
3. The template includes:
   - Professional gradient header with emoji icon
   - Clean card-based layout
   - All payment details in an organized format
   - Call-to-action button linking to admin verification page
   - Responsive design that works on mobile and desktop

**Subject:**
```
MMG Payment Screenshot Uploaded – {{plan}}
```

#### Option 2: Plain Text Template (Simple Alternative)

**Subject:**
```
MMG Payment Screenshot Uploaded – {{plan}}
```

**Body:**
```
User {{user_email}} has uploaded an MMG payment screenshot.

Plan: {{plan}}
Amount: {{amount}}
Reference: {{reference_message}}
Request ID: {{request_id}}
Uploaded at: {{uploaded_at}}

Please proceed with verification: https://stashway.app/admin/mmg/verify?request_id={{request_id}}
```

**Note:** We recommend using the HTML template for a more professional appearance.

## Step 4: Get Public Key

1. Go to Account → API Keys in EmailJS dashboard
2. Copy your Public Key

## Step 5: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
VITE_EMAILJS_SERVICE_ID=stashway_mmg_service
VITE_EMAILJS_TEMPLATE_ID=mmg_user_upload
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

**Note:** The `.env.local` file should be in the root of your project and should NOT be committed to git (it should already be in `.gitignore`).

## Step 6: Verify Implementation

The email notification is automatically sent after a successful screenshot upload. The implementation:

- ✅ Sends email to both `stefan.gravesande@preqal.com` and `stefan.gravesande@gmail.com`
- ✅ Includes all required fields (user email, plan, amount, reference message, request ID, upload timestamp)
- ✅ Does not block the UI if email sending fails (shows warning in console only)
- ✅ Only sends email after successful upload

## Troubleshooting

If emails are not being sent:

1. Check browser console for errors
2. Verify all environment variables are set correctly
3. Verify EmailJS service and template IDs match exactly
4. Check EmailJS dashboard for delivery logs
5. Ensure the EmailJS service is properly connected to your email provider

