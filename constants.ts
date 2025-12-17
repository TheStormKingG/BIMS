import { ChartPie, Wallet, Landmark, ScanLine, Calculator, Settings as SettingsIcon, Upload, Target, MessageCircle } from 'lucide-react';

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
  { id: 'dashboard', label: 'Overview', icon: ChartPie, path: '/overview' },
  { id: 'accounts', label: 'Funds', icon: Landmark, path: '/funds' },
  { id: 'scan', label: 'Upload', icon: Upload, path: '/scan' },
  { id: 'expenses', label: 'Spending', icon: Calculator, path: '/spending' },
  { id: 'goals', label: 'Goals', icon: Target, path: '/goals' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, path: '/settings' },
];
