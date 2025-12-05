import React, { useState, useEffect } from 'react';
import { NAV_ITEMS } from './constants';
import { Accounts } from './components/Accounts';
import { Spending } from './components/Spending';
import { Scanner } from './components/Scanner';
import { Dashboard } from './components/Dashboard';
import { useWallet } from './hooks/useWallet';
import { useBanks } from './hooks/useBanks';
import { useSpentItems } from './hooks/useSpentItems';
import { addFundsOut } from './services/fundsOutDatabase';

function App() {
  const [activeTab, setActiveTab] = useState('accounts');
  
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
    fundsOutTransactions,
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
    addSpentItems,
    loadCurrentMonth,
  } = useSpentItems();

  const loading = walletLoading || banksLoading || spentItemsLoading;
  const error = walletError || banksError || spentItemsError;

  const handleUpdateWallet = async (balance: number) => {
    try {
      await updateWallet(balance);
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

  const handleAddWalletFunds = async (source: string, amount: number) => {
    try {
      // Add funds to the wallet (updates banks table)
      await addFundsToWallet(amount);
      
      // Record the transaction in bank_in table (wallet is now a bank)
      const walletBank = banks.find(bank => bank.bank_name === 'Cash Wallet');
      if (walletBank) {
        await addBankInTransaction(walletBank.id, amount, source);
      }

      // If source is a bank account, deduct the amount from it
      if (source !== 'Cash-In (Payments, Gifts, Etc.)' && !source.startsWith('Cash-In')) {
        const sourceBank = banks.find(bank => bank.bank_name === source);
        if (sourceBank) {
          const newBalance = Number(sourceBank.total) - amount;
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
      case 'accounts':
        return (
          <Accounts 
            wallet={wallet}
            walletBalance={cashBalance}
            walletTransactions={[]} // No longer using wallet_in table - transactions come from bank_in
            walletFundsOut={fundsOutTransactions
              .filter(txn => txn.source_account_type === 'CASH_WALLET')
              .map(txn => ({
                id: txn.id,
                amount: Number(txn.amount),
                transaction_datetime: txn.transaction_datetime,
                source: txn.source,
              }))}
            accounts={banks.map(bank => ({
              id: bank.id,
              name: bank.bank_name,
              type: bank.bank_name === 'Cash Wallet' ? 'CASH_WALLET' as const : 'BANK' as const,
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
            walletTransactionsForBanks={[]} // No longer using wallet_in table
            onAddAccount={handleAddBank}
            onRemoveAccount={handleDeleteBank}
            onAddFunds={handleAddBankFunds}
            onAddWalletFunds={handleAddWalletFunds}
          />
        );
      
      case 'expenses':
        return (
          <Spending 
            spentItems={spentItems} 
            loading={spentItemsLoading}
            banks={banks.filter(bank => bank.bank_name !== 'Cash Wallet').map(bank => ({
              id: bank.id,
              name: bank.bank_name,
              type: 'BANK' as const,
              balance: Number(bank.total)
            }))}
            wallet={wallet}
            walletBalance={cashBalance}
            onAddSpend={async (item) => {
              try {
                // Check funds BEFORE saving spent items
                if (item.paymentMethod) {
                  // Find the account
                  const isWallet = item.paymentMethod === 'Cash Wallet';
                  const walletBankEntry = banks.find(bank => bank.bank_name === 'Cash Wallet');
                  const account = isWallet 
                    ? walletBankEntry 
                    : banks.find(bank => bank.bank_name === item.paymentMethod);
                  
                  if (isWallet && walletBankEntry) {
                    // Check if wallet has enough balance
                    if (Number(walletBankEntry.total) < item.itemTotal) {
                      alert(`Error: Insufficient funds in wallet. Wallet has ${Number(walletBankEntry.total).toLocaleString()} GYD, but ${item.itemTotal.toLocaleString()} GYD is needed.`);
                      return; // Don't proceed with the transaction
                    }
                  } else if (account && !isWallet) {
                    // Check if bank has enough funds
                    if (Number(account.total) < item.itemTotal) {
                      alert(`Error: Insufficient funds in ${account.bank_name}. Account has ${Number(account.total).toLocaleString()} GYD, but ${item.itemTotal.toLocaleString()} GYD is needed.`);
                      return; // Don't proceed with the transaction
                    }
                  }
                }
                
                // Save spent items
                const addedItems = await addSpentItems([item]);
                await loadCurrentMonth();
                
                // Deduct from payment method and record in funds_out
                if (item.paymentMethod) {
                  // Find the account
                  const isWallet = item.paymentMethod === 'Cash Wallet';
                  const walletBankEntry = banks.find(bank => bank.bank_name === 'Cash Wallet');
                  const account = isWallet 
                    ? walletBankEntry 
                    : banks.find(bank => bank.bank_name === item.paymentMethod);
                  
                  if (isWallet && walletBankEntry) {
                    // Deduct from wallet balance
                    const newBalance = Number(walletBankEntry.total) - item.itemTotal;
                    if (newBalance < 0) {
                      alert('Warning: Wallet balance will be negative!');
                    }
                    await updateBank(walletBankEntry.id, walletBankEntry.bank_name, newBalance);
                    
                    // Record in funds_out
                    await addFundsOut({
                      source_account_id: walletBankEntry.id,
                      source_account_type: 'CASH_WALLET',
                      source_account_name: 'Cash Wallet',
                      amount: item.itemTotal,
                      transaction_datetime: item.transactionDateTime,
                      spent_table_id: addedItems.length > 0 ? addedItems[0].id : null,
                      source: item.source,
                    });
                  } else if (account && !isWallet) {
                    // Deduct from bank account
                    const newBalance = Number(account.total) - item.itemTotal;
                    if (newBalance < 0) {
                      alert('Warning: Bank account balance will be negative!');
                    }
                    await updateBank(account.id, account.bank_name, newBalance);
                    
                    // Record in funds_out
                    await addFundsOut({
                      source_account_id: account.id,
                      source_account_type: 'BANK',
                      source_account_name: account.bank_name,
                      amount: item.itemTotal,
                      transaction_datetime: item.transactionDateTime,
                      spent_table_id: addedItems.length > 0 ? addedItems[0].id : null,
                      source: item.source,
                    });
                  }
                }
              } catch (err) {
                alert('Failed to add spending: ' + (err instanceof Error ? err.message : 'Unknown error'));
              }
            }}
          />
        );
      
      case 'scan':
        // Get wallet from banks table (it's now stored as "Cash Wallet" bank entry)
        const walletBank = banks.find(bank => bank.bank_name === 'Cash Wallet');
        const allAccounts = walletBank 
          ? [
              {
                id: walletBank.id,
                name: 'Cash Wallet',
                type: 'CASH_WALLET' as const,
                balance: Number(walletBank.total)
              },
              ...banks.filter(bank => bank.bank_name !== 'Cash Wallet').map(bank => ({
                id: bank.id,
                name: bank.bank_name,
                type: 'BANK' as const,
                balance: Number(bank.total)
              }))
            ]
          : banks.map(bank => ({
              id: bank.id,
              name: bank.bank_name,
              type: 'BANK' as const,
              balance: Number(bank.total)
            }));
        
        return (
          <Scanner 
            accounts={allAccounts}
            onSave={async (receiptData, accountId) => {
              try {
                // Find the account to get payment method name
                const account = allAccounts.find(acc => acc.id === accountId);
                const paymentMethod = account?.type === 'CASH_WALLET' ? 'Cash Wallet' : account?.name || 'Unknown';
                
                // Convert receipt items to spent_table format
                // Use the receipt date with current time, or just current time if date parsing fails
                let transactionDate: string;
                try {
                  const receiptDate = new Date(receiptData.date);
                  if (isNaN(receiptDate.getTime())) {
                    transactionDate = new Date().toISOString();
                  } else {
                    // Use receipt date but with current time
                    const now = new Date();
                    receiptDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
                    transactionDate = receiptDate.toISOString();
                  }
                } catch {
                  transactionDate = new Date().toISOString();
                }
                
                const spentItemsToAdd = receiptData.items.map(item => ({
                  transactionDateTime: transactionDate,
                  category: item.category,
                  item: item.description,
                  itemCost: item.unitPrice,
                  itemQty: item.quantity,
                  itemTotal: item.total,
                  paymentMethod: paymentMethod,
                  source: 'SCAN_RECEIPT' as const,
                }));
                
                const addedSpentItems = await addSpentItems(spentItemsToAdd);
                
                // Refresh current month items
                await loadCurrentMonth();
                
                // Deduct total from selected payment method
                if (account?.type === 'BANK') {
                  // Deduct from bank account
                  const newBalance = account.balance - receiptData.total;
                  if (newBalance < 0) {
                    alert('Warning: Bank account balance will be negative!');
                  }
                  await updateBank(account.id, account.name, newBalance);
                  
                  // Record in funds_out
                  await addFundsOut({
                    source_account_id: account.id,
                    source_account_type: 'BANK',
                    source_account_name: account.name,
                    amount: receiptData.total,
                    transaction_datetime: transactionDate,
                    spent_table_id: addedSpentItems.length > 0 ? addedSpentItems[0].id : null,
                    source: 'SCAN_RECEIPT',
                  });
                } else if (account?.type === 'CASH_WALLET') {
                  const walletBankEntry = banks.find(bank => bank.bank_name === 'Cash Wallet');
                  if (!walletBankEntry) {
                    alert('Error: Cash Wallet not found in banks table.');
                    return;
                  }
                  
                  // Check if wallet has enough balance
                  if (Number(walletBankEntry.total) < receiptData.total) {
                    alert(`Error: Insufficient funds in wallet. Wallet has ${Number(walletBankEntry.total).toLocaleString()} GYD, but ${receiptData.total.toLocaleString()} GYD is needed.`);
                    return; // Don't proceed with the transaction
                  }
                  
                  // Deduct from wallet balance
                  const newBalance = Number(walletBankEntry.total) - receiptData.total;
                  if (newBalance < 0) {
                    alert('Warning: Wallet balance will be negative!');
                  }
                  await updateBank(walletBankEntry.id, walletBankEntry.bank_name, newBalance);
                  
                  // Record in funds_out
                  await addFundsOut({
                    source_account_id: walletBankEntry.id,
                    source_account_type: 'CASH_WALLET',
                    source_account_name: 'Cash Wallet',
                    amount: receiptData.total,
                    transaction_datetime: transactionDate,
                    spent_table_id: addedSpentItems.length > 0 ? addedSpentItems[0].id : null,
                    source: 'SCAN_RECEIPT',
                  });
                }
                
                // Show success and navigate
                alert('Receipt scanned and saved successfully!');
                setActiveTab('expenses');
              } catch (err) {
                alert('Failed to save receipt: ' + (err instanceof Error ? err.message : 'Unknown error'));
              }
            }}
          />
        );
      
      case 'dashboard':
        return (
          <Dashboard 
            accounts={banks.map(bank => ({
              id: bank.id,
              name: bank.bank_name,
              type: bank.bank_name === 'Cash Wallet' ? 'CASH_WALLET' as const : 'BANK' as const,
              balance: Number(bank.total)
            }))}
            spentItems={spentItems}
            totalBalance={totalInBanks}
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