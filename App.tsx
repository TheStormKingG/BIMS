import React, { useState } from 'react';
import { 
  ReceiptScanResult,
  Transaction,
  CashDenominations
} from './types';
import { NAV_ITEMS } from './constants';
import { Dashboard } from './components/Dashboard';
import { CashWallet } from './components/CashWallet';
import { Scanner } from './components/Scanner';
import { TransactionList } from './components/TransactionList';
import { Accounts } from './components/Accounts';
import { useSupabaseData } from './hooks/useSupabaseData';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Use Supabase data hook
  const {
    wallet,
    bankAccounts,
    transactions,
    cashBalance,
    totalBalance,
    loading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    updateWallet,
    addTransaction,
    updateTransaction,
  } = useSupabaseData();

  const handleUpdateWallet = async (denoms: CashDenominations) => {
    if (wallet) {
      try {
        await updateWallet(wallet.id, denoms);
      } catch (err) {
        alert('Failed to update wallet: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  };

  const handleAddAccount = async (name: string, balance: number) => {
    try {
      await addAccount(name, balance);
    } catch (err) {
      alert('Failed to add account: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRemoveAccount = async (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await deleteAccount(id);
      } catch (err) {
        alert('Failed to delete account: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  };

  const handleSaveTransaction = async (data: ReceiptScanResult, accountId: string) => {
    try {
      await addTransaction({
        merchant: data.merchant,
        date: data.date,
        totalAmount: data.total,
        items: data.items,
        accountId: accountId,
        source: 'SCAN_RECEIPT'
      });

      // Show alert for cash wallet transactions
      if (wallet && accountId === wallet.id) {
        alert("Transaction saved! Please manually update your Cash Wallet denominations to match your physical cash.");
      }
      
      // Move to expenses tab after save
      setActiveTab('expenses');
    } catch (err) {
      alert('Failed to save transaction: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    try {
      await updateTransaction(updatedTx.id, updatedTx);
    } catch (err) {
      alert('Failed to update transaction: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const renderContent = () => {
    // Show loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600">Loading data from Supabase...</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to connect to Supabase</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <p className="text-sm text-slate-500">Make sure your Supabase credentials are configured correctly. Check the console for details.</p>
          </div>
        </div>
      );
    }

    // Normal content
    const allAccounts = wallet ? [wallet, ...bankAccounts] : bankAccounts;

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            accounts={allAccounts} 
            transactions={transactions} 
            totalBalance={totalBalance} 
          />
        );
      case 'wallet':
        return wallet ? (
          <CashWallet 
            wallet={wallet} 
            onUpdate={handleUpdateWallet} 
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600">No cash wallet found. Creating one...</p>
          </div>
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
            accounts={allAccounts} 
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