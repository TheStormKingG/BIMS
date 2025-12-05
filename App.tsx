import React, { useState, useEffect } from 'react';
import { 
  CashDenominations
} from './types';
import { NAV_ITEMS } from './constants';
import { CashWallet } from './components/CashWallet';
import { Accounts } from './components/Accounts';
import { Spending } from './components/Spending';
import { useWallet } from './hooks/useWallet';
import { useBanks } from './hooks/useBanks';
import { useSpentItems } from './hooks/useSpentItems';

function App() {
  const [activeTab, setActiveTab] = useState('wallet');
  
  // Use wallet hook
  const {
    wallet,
    cashBalance,
    loading: walletLoading,
    error: walletError,
    updateWallet,
    addFunds: addFundsToWallet,
  } = useWallet();

  // Use banks hook
  const {
    banks,
    bankInTransactions,
    walletInTransactions,
    totalInBanks,
    loading: banksLoading,
    error: banksError,
    addBank,
    updateBank,
    deleteBank,
    addBankInTransaction,
    addWalletInTransaction,
  } = useBanks();

  // Use spent items hook
  const {
    spentItems,
    loading: spentItemsLoading,
    error: spentItemsError,
    loadCurrentMonth,
  } = useSpentItems();

  // Load current month items on mount
  useEffect(() => {
    loadCurrentMonth();
  }, [loadCurrentMonth]);

  const loading = walletLoading || banksLoading || spentItemsLoading;
  const error = walletError || banksError || spentItemsError;

  const handleUpdateWallet = async (denoms: CashDenominations) => {
    try {
      await updateWallet(denoms);
    } catch (err) {
      alert('Failed to update wallet: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleAddBank = async (name: string, balance: number) => {
    try {
      await addBank(name, balance);
    } catch (err) {
      alert('Failed to add bank: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUpdateBank = async (id: string, name: string, balance: number) => {
    try {
      await updateBank(id, name, balance);
    } catch (err) {
      alert('Failed to update bank: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (confirm('Are you sure you want to delete this bank account?')) {
      try {
        await deleteBank(id);
      } catch (err) {
        alert('Failed to delete bank: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  };

  const handleAddBankFunds = async (bankId: string, amount: number, source: string) => {
    try {
      await addBankInTransaction(bankId, amount, source);
    } catch (err) {
      alert('Failed to add funds: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleAddWalletFunds = async (source: string, denominations: CashDenominations) => {
    try {
      // Calculate total amount
      const totalAmount = Object.entries(denominations).reduce(
        (sum, [denom, count]) => sum + Number(denom) * Number(count),
        0
      );

      // Add funds to the wallet (updates wallet_snapshots)
      await addFundsToWallet(denominations);
      
      // Record the transaction in wallet_in table
      await addWalletInTransaction(source, denominations);

      // If source is a bank account, deduct the amount from it
      if (source !== 'Cash-In') {
        const sourceBank = banks.find(bank => bank.bank_name === source);
        if (sourceBank) {
          const newBalance = Number(sourceBank.total) - totalAmount;
          if (newBalance < 0) {
            alert('Warning: Bank account balance is now negative!');
          }
          await updateBank(sourceBank.id, sourceBank.bank_name, newBalance);
        }
      }
    } catch (err) {
      alert('Failed to add wallet funds: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const renderContent = () => {
    // Show loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600">Loading wallet from Supabase...</p>
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
            <p className="text-sm text-slate-500 mb-4">Make sure you've run the SQL schema in Supabase.</p>
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Open Supabase Dashboard
            </a>
          </div>
        </div>
      );
    }

    // Render content based on active tab
    switch (activeTab) {
      case 'wallet':
        return wallet ? (
          <CashWallet 
            wallet={wallet}
            banks={banks.map(bank => ({
              id: bank.id,
              name: bank.bank_name,
              type: 'BANK' as const,
              balance: Number(bank.total)
            }))}
            walletTransactions={walletInTransactions.map(txn => ({
              id: txn.id,
              source: txn.source,
              total: Number(txn.total),
              note_5000: txn.note_5000,
              note_2000: txn.note_2000,
              note_1000: txn.note_1000,
              note_500: txn.note_500,
              note_100: txn.note_100,
              note_50: txn.note_50,
              note_20: txn.note_20,
              datetime: txn.datetime
            }))}
            onUpdate={handleUpdateWallet}
            onAddFunds={handleAddWalletFunds}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600">Initializing wallet...</p>
          </div>
        );
      
      case 'accounts':
        return (
          <Accounts 
            accounts={banks.map(bank => ({
              id: bank.id,
              name: bank.bank_name,
              type: 'BANK' as const,
              balance: Number(bank.total)
            }))}
            bankTransactions={bankInTransactions.map(txn => ({
              id: txn.destination,
              txnId: txn.id,
              amount: Number(txn.amount),
              source: txn.source,
              datetime: txn.datetime,
              type: 'deposit' as const
            }))}
            walletTransactions={walletInTransactions.map(txn => ({
              id: txn.id,
              source: txn.source,
              total: Number(txn.total),
              datetime: txn.datetime
            }))}
            onAddAccount={handleAddBank}
            onRemoveAccount={handleDeleteBank}
            onAddFunds={handleAddBankFunds}
          />
        );
      
      case 'expenses':
        return (
          <Spending spentItems={spentItems} loading={spentItemsLoading} />
        );
      
      case 'dashboard':
      case 'scan':
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="text-emerald-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Coming Soon</h3>
              <p className="text-slate-600 mb-2">This feature is under development.</p>
              <p className="text-sm text-slate-500">
                {activeTab === 'dashboard' && 'Dashboard with analytics and charts'}
                {activeTab === 'scan' && 'Receipt scanning with AI'}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Cash Wallet
                </button>
                <button
                  onClick={() => setActiveTab('accounts')}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Banks
                </button>
              </div>
            </div>
          </div>
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