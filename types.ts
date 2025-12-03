export type AccountType = 'BANK' | 'CASH_WALLET';

export interface BankAccount {
  id: string;
  name: string;
  type: 'BANK';
  balance: number; // In GYD
}

// Key is the note value (e.g., 5000), Value is the count of notes
export type CashDenominations = Record<number, number>;

export interface CashWallet {
  id: string;
  type: 'CASH_WALLET';
  denominations: CashDenominations;
}

export type Account = BankAccount | CashWallet;

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO Date string
  merchant: string;
  totalAmount: number;
  items: LineItem[];
  accountId: string; // which account paid for this
  source: 'MANUAL' | 'SCAN_RECEIPT' | 'IMPORT_EMAIL' | 'IMPORT_SMS';
}

export interface ReceiptScanResult {
  merchant: string;
  date: string;
  items: LineItem[];
  total: number;
}
