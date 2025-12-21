# Shareable & Verifiable Badges & Certificates System

## Overview

This system allows users to earn, share, and verify badges/certificates when they complete achievement goals. It follows the model of professional certificate systems (LinkedIn Learning, Google Certificates, Coursera) with cryptographic verification and public verification pages.

---

## 1. Badge/Certificate Structure

### Credential Object

Each earned badge generates a **Credential** object with the following structure:

```typescript
interface BadgeCredential {
  // Core identifiers
  credential_id: string; // UUID, internal
  credential_number: string; // Human-friendly, unique, format: STW-YYYY-XXXXXX
  user_id: string; // UUID, internal only (NEVER exposed publicly)
  
  // Public display fields
  recipient_display_name: string; // e.g., "Stefan Gravesande"
  badge_name: string; // e.g., "The Explorer"
  badge_description: string; // Full description of the badge
  badge_level?: string; // Optional: "Bronze" | "Silver" | "Gold"
  
  // Issuance details
  issued_at: string; // ISO timestamp
  issuing_org_name: "Stashway";
  issuing_org_url: "https://stashway.app";
  verification_url: string; // https://stashway.app/verify/{credential_number}
  
  // Achievement context
  goal_id: number;
  goal_title: string;
  criteria_summary: string; // 1-2 lines describing what they did
  
  // Security & verification
  evidence_hash: string; // SHA-256 hash of canonical evidence payload
  signature: string; // HMAC-SHA256 or RSA signature
  status: "ACTIVE" | "REVOKED";
  revoked_at?: string; // ISO timestamp if revoked
  revoked_reason?: string; // Reason for revocation
}
```

### Credential Number Format

- Format: `STW-YYYY-XXXXXX`
- Example: `STW-2025-9F4KQ2`
- Generation: `STW-` + current year + `-` + 6-character base32 uppercase random string
- Must be unique across all credentials
- Unpredictable enough to prevent brute-force guessing

### Evidence Payload (Canonical JSON for Signing)

```json
{
  "credential_number": "STW-2025-9F4KQ2",
  "badge_name": "The Explorer",
  "recipient_display_name": "Stefan Gravesande",
  "issued_at": "2025-01-15T10:30:00Z",
  "goal_id": 1,
  "goal_title": "Welcome to Stashway",
  "status": "ACTIVE",
  "evidence_hash": "a1b2c3d4e5f6..."
}
```

### Shared Badge Card Layout

The visual certificate/badge card should include:

1. **Header Section:**
   - Stashway logo (top left)
   - "Certificate of Achievement" or "Badge Earned" text (top center)

2. **Main Content:**
   - Badge icon/image (large, centered)
   - Badge name (large, bold, prominent)
   - "Awarded to" + recipient name (medium size)
   - "Issued by: Stashway" (small)
   - Issue date (small, formatted: "January 15, 2025")

3. **Verification Section (bottom):**
   - Credential number label: "Credential ID: STW-2025-9F4KQ2"
   - Verification text: "Verify at stashway.app/verify/STW-2025-9F4KQ2"
   - QR code (optional) encoding the verification URL

4. **Footer:**
   - Criteria summary (1-2 lines, italic, smaller font)
   - Stashway branding

**Design Requirements:**
- Clean, professional certificate layout
- Suitable for sharing on LinkedIn, social media, or printing
- High-resolution (at least 1200x800px for PNG export)
- Consistent with Stashway branding (emerald green accents, clean typography)

---

## 2. Share Function (User Experience)

### UI Integration

Add a "Share Badge" button to:
- Completed goal cards (system goals)
- Badge detail modal/page
- Celebration modal (after earning a badge)

### Share Modal

When user clicks "Share Badge", show a modal with:

**A. Preview Section:**
- Live preview of the badge card (as it will appear when shared)
- Responsive preview (shows how it looks on different platforms)

**B. Share Actions:**
1. **Copy Link** button
   - Copies verification URL to clipboard
   - Shows toast: "Verification link copied!"

2. **Copy Credential Number** button
   - Copies credential number to clipboard
   - Shows toast: "Credential number copied!"

3. **Download Badge Image** button
   - Generates PNG/SVG of badge card
   - Downloads as: `stashway-badge-{credential_number}.png`

4. **Share to LinkedIn** button
   - Opens LinkedIn share dialog
   - Pre-fills with share message template
   - Optionally includes badge image attachment

5. **Share to WhatsApp** button
   - Opens WhatsApp (web or app)
   - Pre-fills message with template + verification URL

6. **Share to X (Twitter)** button (optional)
   - Opens Twitter compose
   - Pre-fills tweet with template + verification URL

### Share Message Template

**Default template (editable by user):**
```
I just earned the {badge_name} badge on Stashway for {criteria_summary}. 

Verify my achievement: {verification_url}
```

**Example:**
```
I just earned the The Explorer badge on Stashway for logging in and viewing my primary Overview dashboard for the first time.

Verify my achievement: https://stashway.app/verify/STW-2025-9F4KQ2
```

---

## 3. Public Verification Page

### Routes

1. **GET /verify** - Search/Input page
   - Simple input field: "Enter Credential Number"
   - Submit button
   - Redirects to `/verify/:credential_number`

2. **GET /verify/:credential_number** - Verification result page
   - Public route (no authentication required)
   - Shows verification result

### Verification Page UI

**If Verified (status: ACTIVE, signature matches):**

```
┌─────────────────────────────────────────┐
│  ✅ Verified                            │
│                                         │
│  [Badge Icon/Image]                    │
│                                         │
│  Badge: The Explorer                   │
│  Awarded to: Stefan Gravesande         │
│  Issued: January 15, 2025              │
│  Issued by: Stashway                   │
│                                         │
│  Credential ID: STW-2025-9F4KQ2        │
│                                         │
│  Criteria: Logged in and viewed        │
│  primary Overview dashboard for        │
│  the first time.                       │
│                                         │
│  [Share this badge] button             │
└─────────────────────────────────────────┘
```

**If Revoked:**
```
┌─────────────────────────────────────────┐
│  ❌ Revoked                             │
│                                         │
│  This credential has been revoked.     │
│                                         │
│  Revoked: March 1, 2025                │
│  Reason: Account closure               │
└─────────────────────────────────────────┘
```

**If Not Found / Invalid:**
```
┌─────────────────────────────────────────┐
│  ❌ Not Verified                        │
│                                         │
│  The credential number provided could  │
│  not be verified.                      │
│                                         │
│  Please check the credential number    │
│  and try again.                        │
└─────────────────────────────────────────┘
```

### Verification Logic

```typescript
async function verifyCredential(credentialNumber: string): Promise<VerificationResult> {
  // 1. Lookup credential by credential_number
  const credential = await getCredentialByNumber(credentialNumber);
  
  if (!credential) {
    return { verified: false, reason: "NOT_FOUND" };
  }
  
  // 2. Check status
  if (credential.status === "REVOKED") {
    return { 
      verified: false, 
      reason: "REVOKED",
      revoked_at: credential.revoked_at,
      revoked_reason: credential.revoked_reason
    };
  }
  
  // 3. Verify signature
  const canonicalPayload = createCanonicalPayload(credential);
  const computedSignature = computeSignature(canonicalPayload);
  
  if (computedSignature !== credential.signature) {
    return { verified: false, reason: "SIGNATURE_MISMATCH" };
  }
  
  // 4. Verify evidence hash (optional additional check)
  const computedEvidenceHash = hashEvidence(canonicalPayload);
  if (computedEvidenceHash !== credential.evidence_hash) {
    return { verified: false, reason: "EVIDENCE_MISMATCH" };
  }
  
  // 5. All checks passed
  return { 
    verified: true, 
    credential: sanitizeCredentialForPublic(credential) 
  };
}
```

---

## 4. Security & Anti-Fraud Measures

### Signature Generation

**Option A: HMAC-SHA256 (Recommended for MVP)**
```typescript
function computeSignature(payload: CanonicalPayload): string {
  const secret = process.env.BADGE_SIGNING_SECRET; // Server-side only
  const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHmac('sha256', secret).update(canonicalJson).digest('hex');
}
```

**Option B: RSA Signing (More robust, for production)**
- Generate RSA key pair
- Sign with private key
- Verify with public key (can be embedded in verification page)

### Security Best Practices

1. **Credential Number Generation:**
   - Use cryptographically secure random generator
   - Check for uniqueness before insertion
   - Format: `STW-YYYY-XXXXXX` (6 chars = 32^6 = ~1 billion combinations per year)

2. **Data Exposure:**
   - NEVER expose `user_id` in public verification
   - Only expose: `recipient_display_name`, `badge_name`, `issued_at`, `credential_number`, `criteria_summary`

3. **Rate Limiting:**
   - Limit verification requests: 10 per IP per minute
   - Limit credential generation: prevent duplicate issuance

4. **Audit Logging:**
   - Log all verification attempts
   - Log all credential issuances
   - Log all revocations

5. **Revocation:**
   - Only system admins can revoke
   - Must provide reason
   - Revoked credentials still accessible but marked as revoked

---

## 5. Database Schema

### Table: `badge_credentials`

```sql
CREATE TABLE badge_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Public display fields
  recipient_display_name TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT NOT NULL,
  badge_level TEXT, -- Optional: 'Bronze', 'Silver', 'Gold'
  
  -- Issuance details
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issuing_org_name TEXT NOT NULL DEFAULT 'Stashway',
  issuing_org_url TEXT NOT NULL DEFAULT 'https://stashway.app',
  
  -- Achievement context
  goal_id INTEGER NOT NULL REFERENCES system_goals(id),
  goal_title TEXT NOT NULL,
  criteria_summary TEXT NOT NULL,
  
  -- Security & verification
  evidence_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_badge_credentials_credential_number ON badge_credentials(credential_number);
CREATE INDEX idx_badge_credentials_user_id ON badge_credentials(user_id);
CREATE INDEX idx_badge_credentials_status ON badge_credentials(status);
```

### Table: `badge_credential_events` (Audit Log)

```sql
CREATE TABLE badge_credential_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES badge_credentials(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('ISSUED', 'SHARED', 'VERIFIED', 'REVOKED')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET, -- For verification events
  user_agent TEXT -- For verification events
);

CREATE INDEX idx_badge_credential_events_credential_id ON badge_credential_events(credential_id);
CREATE INDEX idx_badge_credential_events_event_type ON badge_credential_events(event_type);
CREATE INDEX idx_badge_credential_events_occurred_at ON badge_credential_events(occurred_at);
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE badge_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_credential_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own credentials
CREATE POLICY "Users can view their own credentials"
ON badge_credentials FOR SELECT
USING (auth.uid() = user_id);

-- Public can verify via RPC function only (see below)
-- No direct SELECT policy for public

-- Only service role can insert/update credentials
-- (Handled via service role key, not RLS)
```

### Public Verification RPC Function

```sql
CREATE OR REPLACE FUNCTION verify_badge_credential(cred_num TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cred RECORD;
  result JSON;
BEGIN
  -- Lookup credential
  SELECT * INTO cred
  FROM badge_credentials
  WHERE credential_number = cred_num;
  
  IF NOT FOUND THEN
    RETURN json_build_object('verified', false, 'reason', 'NOT_FOUND');
  END IF;
  
  -- Check status
  IF cred.status = 'REVOKED' THEN
    RETURN json_build_object(
      'verified', false,
      'reason', 'REVOKED',
      'revoked_at', cred.revoked_at,
      'revoked_reason', cred.revoked_reason
    );
  END IF;
  
  -- Return public-safe fields only (no user_id, internal data)
  RETURN json_build_object(
    'verified', true,
    'credential_number', cred.credential_number,
    'recipient_display_name', cred.recipient_display_name,
    'badge_name', cred.badge_name,
    'badge_description', cred.badge_description,
    'badge_level', cred.badge_level,
    'issued_at', cred.issued_at,
    'issuing_org_name', cred.issuing_org_name,
    'goal_title', cred.goal_title,
    'criteria_summary', cred.criteria_summary,
    'signature', cred.signature -- For client-side verification
  );
END;
$$;

-- Grant execute to public (anonymous users)
GRANT EXECUTE ON FUNCTION verify_badge_credential(TEXT) TO anon, authenticated;
```

---

## 6. Issuance Logic

### When a Goal is Completed

```typescript
async function issueCredential(userId: string, goalId: number): Promise<BadgeCredential> {
  // 1. Check if credential already exists for this goal completion
  const existing = await getCredentialByUserAndGoal(userId, goalId);
  if (existing) {
    return existing; // Don't issue duplicate
  }
  
  // 2. Get user and goal data
  const user = await getUserProfile(userId);
  const goal = await getSystemGoalById(goalId);
  const badge = await getBadgeByGoalId(goalId);
  
  // 3. Generate credential number
  const credentialNumber = generateCredentialNumber();
  
  // 4. Create canonical evidence payload
  const evidencePayload = {
    credential_number: credentialNumber,
    badge_name: badge.badge_name,
    recipient_display_name: user.display_name || user.email.split('@')[0],
    issued_at: new Date().toISOString(),
    goal_id: goal.id,
    goal_title: goal.title,
    status: 'ACTIVE'
  };
  
  // 5. Generate hash and signature
  const evidenceHash = hashPayload(evidencePayload);
  const signature = computeSignature(evidencePayload);
  
  // 6. Create credential record
  const credential = await insertCredential({
    credential_number: credentialNumber,
    user_id: userId,
    recipient_display_name: evidencePayload.recipient_display_name,
    badge_name: badge.badge_name,
    badge_description: badge.badge_description,
    goal_id: goal.id,
    goal_title: goal.title,
    criteria_summary: goal.description, // Or create custom summary
    evidence_hash: evidenceHash,
    signature: signature,
    status: 'ACTIVE'
  });
  
  // 7. Log issuance event
  await logCredentialEvent({
    credential_id: credential.id,
    event_type: 'ISSUED',
    metadata: { goal_id: goal.id }
  });
  
  return credential;
}
```

---

## 7. Implementation Tasks

### Phase 1: Core Infrastructure
- [ ] Create database migrations for `badge_credentials` and `badge_credential_events`
- [ ] Implement credential number generation
- [ ] Implement signature generation and verification
- [ ] Create RPC function for public verification

### Phase 2: Issuance
- [ ] Integrate credential issuance into goal completion flow
- [ ] Test credential generation and uniqueness
- [ ] Add credential to user_badges relationship

### Phase 3: Share UI
- [ ] Create share modal component
- [ ] Implement badge card preview/generation
- [ ] Add download badge image functionality
- [ ] Implement social sharing (LinkedIn, WhatsApp, etc.)

### Phase 4: Verification Page
- [ ] Create `/verify` input page
- [ ] Create `/verify/:credential_number` result page
- [ ] Implement signature verification logic
- [ ] Add QR code generation for verification URLs

### Phase 5: Security & Testing
- [ ] Add rate limiting
- [ ] Implement audit logging
- [ ] Test edge cases (revoked, invalid, expired)
- [ ] Security audit (no data leaks, signature validation)

---

## 8. Example User Flow

1. **User completes goal:**
   - Goal "Welcome to Stashway" is marked complete
   - Badge "The Explorer" is awarded
   - Credential is automatically generated
   - Celebration modal shows with "Share Badge" button

2. **User shares badge:**
   - Clicks "Share Badge"
   - Share modal opens with preview
   - User clicks "Share to LinkedIn"
   - LinkedIn opens with pre-filled message and verification link

3. **Recipient views shared badge:**
   - Clicks verification link in LinkedIn post
   - Redirected to `stashway.app/verify/STW-2025-9F4KQ2`
   - Page shows: ✅ Verified with badge details
   - Can share the verification page

4. **Verification process:**
   - System looks up credential by number
   - Checks status (ACTIVE)
   - Verifies signature matches
   - Displays verified badge with details

---

## 9. Design Considerations

### Badge Card Design
- Professional certificate aesthetic
- Stashway branding (emerald green, clean typography)
- Print-friendly (high resolution, clear layout)
- Social media optimized (proper aspect ratio for previews)

### Verification Page Design
- Clean, trustworthy appearance
- Clear verification status (✅ or ❌)
- Shareable result page
- Mobile responsive

### Performance
- Cache verification results (short TTL, 5 minutes)
- Optimize badge image generation (use canvas or server-side)
- Lazy load verification page assets

---

## 10. Future Enhancements

- Blockchain-based verification (immutable records)
- PDF certificate download
- Badge collections/portfolios
- Expiration dates (optional, for time-limited achievements)
- Multiple recipients (team achievements)
- Certificate templates (different styles)
- Analytics (track shares, verifications)

