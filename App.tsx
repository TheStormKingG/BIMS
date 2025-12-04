import React, { useState, useEffect } from 'react';
import { 
  Account, 
  BankAccount, 
  CashWallet as CashWalletType, 
  CashDenominations, 
  Transaction, 
  ReceiptScanResult 
} from './types';
import { INITIAL_DENOMINATIONS, NAV_ITEMS } from './constants';
import { Dashboard } from './components/Dashboard';
import { CashWallet } from './components/CashWallet';
import { Scanner } from './components/Scanner';
import { TransactionList } from './components/TransactionList';
import { Accounts } from './components/Accounts';

// Mock initial data
const INITIAL_WALLET: CashWalletType = {
  id: 'wallet-1',
  type: 'CASH_WALLET',
  denominations: { ...INITIAL_DENOMINATIONS, 5000: 2, 1000: 5, 100: 10 } // Start with some cash
};

const INITIAL_BANKS: BankAccount[] = [
  { id: 'bank-1', name: 'Republic Bank Checking', type: 'BANK', balance: 150000 },
  { id: 'bank-2', name: 'GBTI Savings', type: 'BANK', balance: 450000 },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wallet, setWallet] = useState<CashWalletType>(INITIAL_WALLET);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(INITIAL_BANKS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Calculate total cash
  const cashBalance = Object.entries(wallet.denominations).reduce(
    (sum, [denom, count]) => sum + Number(denom) * Number(count),
    0
  );

  // Calculate total net worth
  const totalBalance = cashBalance + bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const handleUpdateWallet = (denoms: CashDenominations) => {
    setWallet(prev => ({ ...prev, denominations: denoms }));
  };

  const handleAddAccount = (name: string, balance: number) => {
    const newAccount: BankAccount = {
      id: `bank-${Date.now()}`,
      name,
      type: 'BANK',
      balance
    };
    setBankAccounts(prev => [...prev, newAccount]);
  };

  const handleRemoveAccount = (id: string) => {
    setBankAccounts(prev => prev.filter(a => a.id !== id));
  };

  const handleSaveTransaction = (data: ReceiptScanResult, accountId: string) => {
    // 1. Create Transaction Record
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      merchant: data.merchant,
      date: data.date,
      totalAmount: data.total,
      items: data.items,
      accountId: accountId,
      source: 'SCAN_RECEIPT'
    };

    setTransactions(prev => [newTx, ...prev]);

    // 2. Deduct from Account
    if (accountId === wallet.id) {
       // For cash wallet, we can't easily "deduct" specific notes automatically
       // without complex logic (Making change algorithm).
       // In this app, we act as a ledger. 
       // We will NOT auto-update cash denominations because the user needs to physically check their wallet.
       // However, for Bank accounts, we SHOULD update the balance.
       alert("Transaction saved! Please manually update your Cash Wallet denominations to match your physical cash.");
    } else {
       setBankAccounts(prev => prev.map(acc => {
         if (acc.id === accountId) {
           return { ...acc, balance: acc.balance - data.total };
         }
         return acc;
       }));
    }
    
    // Move to dashboard or ledger after save
    setActiveTab('expenses');
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(tx => {
      if (tx.id === updatedTx.id) {
        // Calculate diff for balance update (only for bank accounts)
        // If the total amount changed, we need to adjust the bank balance
        const oldTotal = tx.totalAmount;
        const newTotal = updatedTx.totalAmount;
        const diff = newTotal - oldTotal;

        if (tx.accountId !== wallet.id && diff !== 0) {
           // If diff is positive (spent more), balance decreases. 
           // If diff is negative (spent less), balance increases.
           setBankAccounts(banks => banks.map(b => {
             if (b.id === tx.accountId) {
               return { ...b, balance: b.balance - diff };
             }
             return b;
           }));
        }
        return updatedTx;
      }
      return tx;
    }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            accounts={[wallet, ...bankAccounts]} 
            transactions={transactions} 
            totalBalance={totalBalance} 
          />
        );
      case 'wallet':
        return (
          <CashWallet 
            wallet={wallet} 
            onUpdate={handleUpdateWallet} 
          />
        );
      case 'accounts':
        return (
           <Accounts 
             accounts={bankAccounts}
             onAddAccount={handleAddAccount}
             onRemoveAccount={handleRemoveAccount}
           />
        );
      case 'scan':
        return (
          <Scanner 
            accounts={[wallet, ...bankAccounts]} 
            onSave={handleSaveTransaction} 
          />
        );
      case 'expenses':
        return (
          <TransactionList 
            transactions={transactions} 
            onUpdateTransaction={handleUpdateTransaction}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64">
      {/* Desktop Navigation (Sidebar) */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex-col p-6 z-20">
        <div className="flex items-center gap-3 mb-10">
           <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-slate-900">S</div>
           <h1 className="text-xl font-bold tracking-tight">Stashway</h1>
        </div>
        
        <div className="space-y-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === item.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>
        
        <div className="mt-auto pt-6 border-t border-white/10">
          <p className="text-xs text-slate-500 text-center">
            &copy; 2025 Stashway
          </p>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full">
         {/* Mobile Header */}
         <div className="md:hidden flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-slate-900">Stashway</h1>
            <div className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">GYD</div>
         </div>

         {renderContent()}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-full py-2 gap-1 transition-colors ${
              activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-current opacity-20' : ''}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;