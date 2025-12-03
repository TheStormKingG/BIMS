import { ChartPie, Wallet, Landmark, ScanLine, Calculator } from 'lucide-react';

export const GYD_DENOMINATIONS = [5000, 2000, 1000, 500, 100, 50, 20];

export const INITIAL_DENOMINATIONS: Record<number, number> = {
  5000: 0,
  2000: 0,
  1000: 0,
  500: 0,
  100: 0,
  50: 0,
  20: 0,
};

export const DEFAULT_CATEGORIES = [
  'Groceries',
  'Dining Out',
  'Transport',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Health',
  'Education',
  'Other'
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: ChartPie },
  { id: 'wallet', label: 'Cash Wallet', icon: Wallet },
  { id: 'accounts', label: 'Banks', icon: Landmark },
  { id: 'scan', label: 'Scan', icon: ScanLine },
  { id: 'expenses', label: 'Ledger', icon: Calculator },
];
