# Goals and Badges System Integration Guide

## Overview

The goals and badges system provides 50 preset progressive goals that reward users with badges upon completion. Goals are automatically available to all users and are evaluated based on app events.

## Database Schema

The system uses 4 main tables:
- `system_goals` - Stores the 50 default goals
- `badges` - Stores badge definitions
- `user_goal_progress` - Tracks user progress on each goal
- `user_badges` - Records badges earned by users

## Initialization

Goals are automatically initialized for new users via `initializeUserGoals()` which should be called:
- On user signup (in App.tsx onAuthStateChange 'SIGNED_IN' event)
- On first login if goals haven't been initialized

## Integration Points

Call `trackEvent()` from `services/goalsService.ts` at these points in the codebase:

### 1. Overview Dashboard View
**Location:** `components/Dashboard.tsx`
**Event:** `overview_viewed`
```typescript
import { trackEvent } from '../services/goalsService';
// In useEffect or component mount
trackEvent(userId, 'overview_viewed', {});
```

### 2. Account Added
**Location:** `components/Accounts.tsx` - `addBank()` or wallet creation
**Event:** `account_added`
```typescript
trackEvent(userId, 'account_added', { account_type: 'bank' | 'cash_wallet' });
```

### 3. Upload/Scanner View
**Location:** `components/Upload.tsx` or `components/Scanner.tsx` - on component mount
**Event:** `upload_viewed`
```typescript
trackEvent(userId, 'upload_viewed', {});
```

### 4. AI Chat Used
**Location:** `services/chatService.ts` or `components/Chat.tsx` - when message sent
**Event:** `ai_chat_used`
```typescript
trackEvent(userId, 'ai_chat_used', { message: userMessage });
```

### 5. Goal Created (User Goals)
**Location:** `services/goalsDatabase.ts` - `createGoal()`
**Event:** `goal_created`
```typescript
trackEvent(userId, 'goal_created', { goal_type: input.goalType });
```

### 6. Receipt Scanned
**Location:** `services/receiptService.ts` - `saveReceipt()` after successful scan
**Event:** `receipt_scanned`
```typescript
trackEvent(userId, 'receipt_scanned', { 
  merchant: receiptData.merchant,
  total: receiptData.total 
});
```

### 7. Manual Transaction Added
**Location:** `services/spentTableDatabase.ts` - `createSpentItem()` when source is 'MANUAL'
**Event:** `transaction_added_manual`
```typescript
trackEvent(userId, 'transaction_added_manual', {
  category: item.category,
  total: item.itemTotal
});
```

### 8. Tip Viewed
**Location:** `components/Tips.tsx` or `components/Dashboard.tsx` - when tip displayed
**Event:** `tip_viewed`
```typescript
trackEvent(userId, 'tip_viewed', { tip_id: tip.id });
```

### 9. Report Exported
**Location:** `services/exportsService.ts` - in export functions (PDF, CSV, Excel)
**Event:** `report_exported`
```typescript
trackEvent(userId, 'report_exported', { format: 'pdf' | 'csv' | 'xlsx' });
```

### 10. Transaction Categorized
**Location:** `components/Spending.tsx` or transaction update functions
**Event:** `transaction_categorized`
```typescript
trackEvent(userId, 'transaction_categorized', { 
  category: newCategory 
});
```

### 11. Cash Wallet Funds Added
**Location:** `services/walletDatabase.ts` - when funds added to wallet
**Event:** `cash_wallet_funds_added`
```typescript
trackEvent(userId, 'cash_wallet_funds_added', { amount: totalAmount });
```

### 12. Spending Searched
**Location:** `components/Spending.tsx` - when search is performed
**Event:** `spending_searched`
```typescript
trackEvent(userId, 'spending_searched', { search_term: searchTerm });
```

## Phase Unlock Logic

Phases unlock based on completion percentage:
- **Phase 1**: Always unlocked
- **Phases 2-4**: Unlock when 70% of previous phase goals are completed
- **Phase 5**: Unlocks only after 100% completion of Phase 4

Use `getPhaseUnlockStatus()` to check which phases are available to a user.

## Goal Evaluation

Goals are evaluated automatically when `trackEvent()` is called. The evaluation engine:
1. Finds all goals matching the event type
2. Calculates progress based on completion criteria
3. Updates progress percentage
4. Awards badges when goals are completed
5. Updates Goal 50 (Stashway Legend) when all 49 previous goals are done

## UI Integration

Use the `useSystemGoals()` hook in components to:
- Display goals grouped by phase
- Show progress percentages
- Display earned badges
- Show phase unlock status

Example:
```typescript
const { goals, progress, badges, phaseUnlocks, loading } = useSystemGoals();
```

## Notes on Evaluation Functions

Some evaluation helper functions in `goalsService.ts` are placeholders and need implementation based on your actual database schema:
- Activity tracking (views, searches) may need a separate `user_activity` table
- Net worth calculations need to aggregate from banks + wallets
- Spending comparisons need baseline storage
- Streak calculations use transaction dates

These can be implemented incrementally as features are used.

