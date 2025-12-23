# Stashway Subscription System Documentation

## Overview

The subscription system provides tiered access to features across three plans: **Personal**, **Pro**, and **Pro Max**. All new users receive a **14-day free trial** that grants Pro-level access during the trial period.

## Architecture

### Database Schema

The `user_subscriptions` table tracks:
- `plan`: Current subscription plan (`none`, `personal`, `pro`, `pro_max`)
- `status`: Subscription status (`trialing`, `active`, `expired`, `canceled`)
- `trial_start_at`, `trial_end_at`: Trial period dates
- `plan_started_at`, `plan_ends_at`: Active subscription period dates

### Subscription Service (`services/subscriptionService.ts`)

**Key Functions:**
- `getUserEntitlement(subscription)`: Calculates user's effective plan and access
- `canUse(featureKey, entitlement)`: Checks if user can use a specific feature
- `requireFeature(featureKey, entitlement)`: Throws error if feature not available
- `ensureUserSubscription(userId)`: Creates trial subscription for new users
- `updateUserSubscriptionPlan(userId, plan)`: Updates user's plan (for plan selection)

**Trial Logic:**
- During trial: `effectivePlan = 'pro'` (grants Pro access)
- After trial expires: `effectivePlan = 'none'` if no plan selected
- Trial lasts 14 days from first signup/login

### React Hook (`hooks/useSubscription.tsx`)

Provides subscription context to all components:
- `subscription`: Current subscription record
- `entitlement`: Computed access rights
- `loading`: Loading state
- `refreshSubscription()`: Force refresh subscription data

### Feature Mapping

Features are mapped to minimum required plans in `FEATURE_PLAN_MAP`:

```typescript
'receipt_scan': 'pro'
'export_csv': 'pro'
'export_excel': 'pro'
'achievements_phase_4': 'pro_max'
'certificates': 'pro_max'
'unlimited_goals': 'pro_max'
// ... etc
```

## Plan Features

### Personal Plan
- Cash Wallet Management
- Up to 2 Bank Accounts
- Basic Analytics (last 30 days only)
- Up to 3 Custom Goals
- Phase 1 Achievement System only
- General AI Q&A (no data-aware insights)
- PDF Export (summary only)

### Pro Plan (Trial grants Pro access)
- Everything in Personal
- Unlimited Bank Accounts
- AI Receipt Scanning
- Receipt Storage
- Transaction Editing & Deletion
- Advanced Analytics (7d, 30d, 90d, 3m, 6m, 1y)
- Up to 15 Custom Goals
- Achievement Phases 1-3
- Contextual AI (reads user spending data)
- AI Tips Generation
- CSV & Excel Exports
- Detailed PDF Exports

### Pro Max Plan
- Everything in Pro
- All-time Analytics
- All 5 Achievement Phases
- Phase Completion Certificates
- Verifiable Badge Credentials
- Unlimited Custom Goals
- Advanced AI Coaching (coming soon)

## Adding New Features

### Step 1: Define Feature Key

Add to `FeatureKey` type in `services/subscriptionService.ts`:

```typescript
export type FeatureKey = 
  | 'existing_feature'
  | 'new_feature_key'; // Add here
```

### Step 2: Map to Plan

Add to `FEATURE_PLAN_MAP`:

```typescript
const FEATURE_PLAN_MAP: Record<FeatureKey, SubscriptionPlan> = {
  // ... existing mappings
  'new_feature_key': 'pro', // or 'personal', 'pro_max'
};
```

### Step 3: Gate in Component

```typescript
import { useSubscription } from '../hooks/useSubscription';
import { canUse } from '../services/subscriptionService';

function MyComponent() {
  const { entitlement } = useSubscription();
  const canUseFeature = canUse('new_feature_key', entitlement);
  
  if (!canUseFeature) {
    return <PaywallModal ... />;
  }
  
  // Feature implementation
}
```

### Step 4: Add RLS Policy (if needed)

If the feature involves database operations, add RLS policy in a migration:

```sql
CREATE POLICY "Users can use new feature with Pro plan"
  ON table_name
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    get_effective_plan(auth.uid()) IN ('pro', 'pro_max')
  );
```

## Route Guards

Protected routes automatically check subscription status. If trial expired and user has no plan, they're redirected to `/settings/pricing`.

Routes always accessible:
- `/settings` (read-only)
- `/settings/pricing`
- `/settings/privacy`
- `/settings/terms`
- `/logout`
- Public pages (`/about`, `/verify`, etc.)

## UI Components

### PaywallModal

Displays when user tries to access a gated feature:

```typescript
<PaywallModal
  isOpen={showPaywall}
  onClose={() => setShowPaywall(false)}
  requiredPlan="pro"
  featureName="AI Receipt Scanning"
/>
```

### Settings Page

Shows:
- Current plan with badge
- Trial countdown (if active)
- "Choose Plan" or "Change Plan" button

## Security

### Client-Side Checks
- All UI features check `canUse()` before rendering
- PaywallModal displayed for blocked features
- Buttons disabled/hidden based on plan

### Server-Side Checks (RLS)
- Receipt scanning/storage requires Pro+
- Tips generation requires Pro+
- Phase certificates require Pro Max
- Bank account limits enforced (Personal: 2 max)
- Goal limits enforced (Personal: 3, Pro: 15, Pro Max: unlimited)

### Database Functions
- `get_effective_plan(user_id)`: Returns effective plan for RLS policies
- `check_bank_account_limit(user_id)`: Checks account count against plan
- `check_goal_limit(user_id)`: Checks goal count against plan

## Testing Checklist

- [ ] New user gets 14-day trial on signup
- [ ] Trial grants Pro-level access
- [ ] After trial expires, user redirected to pricing
- [ ] Plan selection immediately grants access
- [ ] Receipt scanning blocked for Personal/expired users
- [ ] CSV/Excel exports blocked for Personal/expired users
- [ ] Transaction editing/deletion blocked for Personal/expired users
- [ ] Bank account limit enforced (Personal: max 2)
- [ ] Goal limit enforced (Personal: 3, Pro: 15, Pro Max: unlimited)
- [ ] Achievement phases restricted by plan
- [ ] Phase certificates only for Pro Max
- [ ] Settings shows current plan and trial countdown
- [ ] All gating works after page refresh
- [ ] RLS policies prevent bypass via direct API calls

## Future Enhancements

1. **Payment Integration**: Replace stub plan selection with Stripe/Paddle
2. **Billing Management**: Add billing history, invoices, payment methods
3. **Subscription Management**: Allow plan downgrades, cancellations
4. **Usage Analytics**: Track feature usage per plan tier
5. **Promotional Codes**: Support discount codes and promotional pricing

