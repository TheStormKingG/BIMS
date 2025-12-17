# Stashway Pro Features Implementation Map

## Current Implementation Status

### ✅ Fully Implemented

1. **Receipt Capture/OCR**
   - Location: `services/geminiService.ts`, `components/Scanner.tsx`, `components/Upload.tsx`
   - Status: Working with Gemini AI, extracts merchant, date, items, totals, categories
   - Database: Data stored in `spent_table` (OCR results only, no image storage)

2. **Spending Tracking**
   - Location: `services/spentTableDatabase.ts`, `hooks/useSpentItems.ts`, `components/Spending.tsx`
   - Database: `spent_table` table with RLS
   - Fields: transaction_datetime, category, item, item_cost, item_qty, item_total, payment_method, source, entry_date, user_id

3. **Funds Accounts**
   - Location: `services/banksDatabase.ts`, `hooks/useBanks.ts`, `components/Accounts.tsx`
   - Database: `banks` table (for bank accounts), `banks` table with `bank_name = 'Cash Wallet'` (for wallet)
   - Supports: Multiple bank accounts, cash wallet with denominations
   - Transactions: `funds_in` (deposits), `funds_out` (withdrawals)

4. **Categories**
   - Location: `constants.ts` - `DEFAULT_CATEGORIES`
   - Status: Fixed list of categories used for receipt parsing

5. **Authentication**
   - Location: `services/supabaseClient.ts`, `components/Login.tsx`
   - Status: Supabase Auth with Google OAuth, RLS enabled

6. **Basic Dashboard**
   - Location: `components/Dashboard.tsx`
   - Status: Shows total balance, spending metrics (today, 7d, 30d), category pie chart, spending over time line chart
   - Time periods: 7days, 1month, 3months, 6months, 1year

### ⚠️ Partially Implemented

1. **Overview Metrics**
   - Location: `components/Dashboard.tsx` lines 43-81
   - Status: Has spentToday, spentLast7Days, spentLast30Days, avgDaily, avgWeekly, avgMonthly
   - Missing: Spent last 24 hours (has today), recent activity list, "most money spent on" (has topItem but needs refinement)

2. **Money Spent Graph**
   - Location: `components/Dashboard.tsx` lines 84-212
   - Status: Has line chart with 7days, 1month, 3months, 6months, 1year
   - Missing: 90d, 1y, All-time periods; proper daily/weekly/monthly aggregation for all ranges

3. **Funds Accounts**
   - Status: Supports multiple accounts but unclear if there's a limit
   - Missing: Archive functionality, explicit "unlimited" support

### ❌ Missing (Pro Features)

1. **Receipt Image Storage**
   - Missing: Supabase Storage bucket for receipts
   - Missing: `receipts` table to link images to spent_table entries
   - Missing: Storage path tracking in spent_table

2. **Receipt PDF Export**
   - Missing: Single receipt PDF generation
   - Missing: Batch receipt PDF export

3. **Enhanced Analytics**
   - Missing: "Spent last 24 hours" (currently only "today" which is 00:00-today)
   - Missing: "Recent activity" section with detailed list
   - Missing: "Most money spent on" merchant/category with better presentation

4. **Money Spent Graph - All Periods**
   - Missing: 90d period option
   - Missing: 1y period option  
   - Missing: All-time period option
   - Missing: Optimal aggregation (daily/weekly/monthly) based on period length

5. **Tips System**
   - Missing: Tips generation logic based on spending patterns
   - Missing: User preference for tip frequency (daily/weekly/monthly/off)
   - Missing: Tips display UI
   - Missing: `tips` or `user_preferences` table

6. **Gamified Goals**
   - Missing: Goals creation UI
   - Missing: Goals tracking from spending data
   - Missing: Points system for streaks/compliance
   - Missing: User rank/level display
   - Missing: `goals` table, `user_points` table or column

7. **AI Chat**
   - Missing: Chat UI component
   - Missing: Chat sessions/messages storage (`chat_sessions`, `chat_messages` tables)
   - Missing: Edge function for AI chat with user data access
   - Missing: RLS for chat data

8. **Export Functionality**
   - Missing: Receipt PDF export (single + batch)
   - Missing: Spending table CSV/XLS export
   - Missing: Overview PDF export (snapshot report)

9. **Plans Metadata**
   - Missing: Plans table or user.plan column
   - Missing: Usage counters (receipts_count_month, funds_accounts_count, months_of_data_available)

---

## Pro Features Gap Checklist

### A) Data & Limits Groundwork
- [ ] Add `user_profiles` or extend `auth.users` metadata with `plan` field (default 'pro')
- [ ] Add usage counters: `receipts_count_month`, `funds_accounts_count`, `months_of_data_available`
- [ ] Create migration SQL

### B) Receipts
- [ ] Create Supabase Storage bucket: `receipts`
- [ ] Create `receipts` table: id, user_id, spent_table_id (FK), storage_path, merchant, total, currency, scanned_at, created_at
- [ ] Update receipt scanning to save image to Storage and create receipt record
- [ ] Implement single receipt PDF export
- [ ] Implement batch receipt PDF export

### C) Funds Accounts (Unlimited)
- [ ] Verify no limits in code
- [ ] Add `archived_at` column to `banks` table
- [ ] Add archive/unarchive UI functionality

### D) Time-based Analytics (Overview)
- [ ] Add "Spent last 24 hours" calculation (rolling 24h, not calendar day)
- [ ] Ensure all metrics are timezone-safe
- [ ] Add "Recent Activity" section with detailed transaction list
- [ ] Enhance "Most money spent on" - show merchant OR category (choose one, document which)
- [ ] Add "Spending by category" breakdown

### E) Money Spent Graph (All Periods)
- [ ] Add 90d period option
- [ ] Add 1y period option
- [ ] Add All-time period option
- [ ] Implement smart aggregation: daily for 7-30d, weekly for 90d-6m, monthly for 1y+
- [ ] Ensure graph handles large datasets efficiently

### F) Tips (Set Frequency)
- [ ] Create `user_preferences` table: user_id, tips_frequency (daily/weekly/monthly/off)
- [ ] Create `tips` table: id, user_id, tip_text, tip_category, generated_at, read_at
- [ ] Implement tip generation logic (basic rules first)
- [ ] Add Tips UI component
- [ ] Add tips frequency setting in Settings

### G) Gamified Goals
- [ ] Create `goals` table: id, user_id, goal_type (spending_limit/savings), target_amount, period (week/month), category (optional), active, created_at
- [ ] Add `user_points` column to user_profiles or separate table
- [ ] Create Goals UI (create/edit/delete goals)
- [ ] Implement progress tracking from spending data
- [ ] Implement points/streaks calculation
- [ ] Add rank/level display

### H) AI Chat (Custom Analyses)
- [ ] Create `chat_sessions` table: id, user_id, created_at, updated_at
- [ ] Create `chat_messages` table: id, session_id, role (user/assistant), content, created_at
- [ ] Create Supabase Edge Function for AI chat
- [ ] Implement RLS policies for chat tables
- [ ] Create Chat UI component
- [ ] Add chat route to App.tsx

### I) Exports
- [ ] Receipt PDF export (single receipt)
- [ ] Receipt PDF export (batch)
- [ ] Spending table CSV export
- [ ] Spending table XLS export (optional, CSV may suffice)
- [ ] Overview PDF export (metrics + chart snapshot)

---

## Database Schema Changes Needed

### New Tables
1. `receipts` - Store receipt image references
2. `user_profiles` - User plan and usage counters
3. `user_preferences` - User settings (tips frequency, etc.)
4. `tips` - Generated tips
5. `goals` - User goals
6. `chat_sessions` - AI chat sessions
7. `chat_messages` - AI chat messages

### New Columns
- `banks.archived_at` - For archiving accounts

### Storage Buckets
- `receipts` - Store receipt images

---

## File Structure for New Features

```
services/
  receiptsDatabase.ts       # Receipt storage operations
  receiptsStorage.ts        # Supabase Storage operations for receipts
  exportsService.ts         # CSV/PDF export utilities
  tipsService.ts            # Tip generation logic
  goalsDatabase.ts          # Goals CRUD operations
  goalsService.ts           # Goals tracking/points calculation
  chatDatabase.ts           # Chat sessions/messages operations
  analyticsService.ts       # Enhanced analytics calculations

components/
  Receipts.tsx              # Receipt list/view (optional)
  Tips.tsx                  # Tips display component
  Goals.tsx                 # Goals management UI
  Chat.tsx                  # AI Chat interface
  ExportDialog.tsx          # Export options modal

hooks/
  useReceipts.ts            # Receipt data hook
  useTips.ts                # Tips data hook
  useGoals.ts               # Goals data hook
  useChat.ts                # Chat data hook

supabase/
  functions/
    ai-chat/
      index.ts              # Edge function for AI chat
```

---

## Next Steps

1. Create migration SQL for all new tables and columns
2. Implement features in order: Receipts → Analytics → Graph → Tips → Goals → Chat → Exports
3. Add UI components and routes
4. Test each feature end-to-end
5. Ensure RLS policies are correct
6. Document everything

