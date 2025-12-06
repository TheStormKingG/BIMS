import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { Accounts } from './components/Accounts';
import { Spending } from './components/Spending';
import { Scanner } from './components/Scanner';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { useWallet } from './hooks/useWallet';
import { useBanks } from './hooks/useBanks';
import { useSpentItems } from './hooks/useSpentItems';
import { addFundsOut, updateFundsOutBySpentTableId } from './services/fundsOutDatabase';
import { getSupabase } from './services/supabaseClient';
import { LogOut, User } from 'lucide-react';

function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const supabase = getSupabase();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
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
    fundsInTransactions,
    fundsOutTransactions,
    totalInBanks,
    loading: banksLoading,
    error: banksError,
    addBank,
    updateBank,
    deleteBank,
    addFundsInTransaction,
  } = useBanks();

  // Use spent items hook
  const {
    spentItems,
    loading: spentItemsLoading,
    error: spentItemsError,
    addSpentItems,
    updateItem: updateSpentItem,
    loadCurrentMonth,
  } = useSpentItems();

  // Check auth state on mount and listen for changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
        // If it's a 403, it might be a configuration issue, but we'll still show login
      }
      setUser(session?.user ?? null);
      setAuthLoading(false);
    }).catch((err) => {
      console.error('Failed to get session:', err);
      setAuthLoading(false);
    });

    // Listen for auth changes (this will catch OAuth callbacks)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
        // Clean up URL hash after successful sign in
        if (window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        // Redirect to overview if on login page
        if (location.pathname === '/' || location.pathname === '/BIMS' || location.pathname === '/BIMS/') {
          navigate('/overview', { replace: true });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        navigate('/', { replace: true });
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on login page, show login
  if (!user && location.pathname !== '/' && location.pathname !== '/BIMS' && location.pathname !== '/BIMS/') {
    return <Navigate to="/" replace />;
  }

  // If authenticated and on login page, redirect to overview
  if (user && (location.pathname === '/' || location.pathname === '/BIMS' || location.pathname === '/BIMS/')) {
    return <Navigate to="/overview" replace />;
  }

  // Show login page if not authenticated
  if (!user) {
    return <Login onLoginSuccess={async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session after login:', error);
        } else {
          setUser(session?.user ?? null);
          navigate('/overview', { replace: true });
        }
      } catch (err) {
        console.error('Failed to get session after login:', err);
      }
    }} />;
  }

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
      await addFundsInTransaction(bankId, amount, source);
    } catch (err) {
      alert('Failed to add funds: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleAddWalletFunds = async (source: string, amount: number) => {
    try {
      // Add funds to the wallet (updates banks table)
      await addFundsToWallet(amount);
      
      // Record the transaction in funds_in table (wallet is now a bank)
      const walletBank = banks.find(bank => bank.bank_name === 'Cash Wallet');
      if (walletBank) {
        await addFundsInTransaction(walletBank.id, amount, source);
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

  // Get current route to determine active tab
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/overview' || path === '/dashboard') return 'dashboard';
    if (path === '/funds' || path === '/accounts') return 'accounts';
    if (path === '/scan') return 'scan';
    if (path === '/spending' || path === '/expenses') return 'expenses';
    return 'dashboard'; // default
  };

  const activeTab = getActiveTab();

  // Protected route wrapper component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const loading = walletLoading || banksLoading || spentItemsLoading;
    const error = walletError || banksError || spentItemsError;
    
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

    return <>{children}</>;
  };

  // Handler functions
  const handleSaveTransaction = async (receiptData: any, accountId: string) => {
    try {
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
      
      // Find the account to get payment method name
      const account = allAccounts.find(acc => acc.id === accountId);
      const paymentMethod = account?.type === 'CASH_WALLET' ? 'Cash Wallet' : account?.name || 'Unknown';
      
      // Convert receipt items to spent_table format
      let transactionDate: string;
      try {
        const receiptDate = new Date(receiptData.date);
        if (isNaN(receiptDate.getTime())) {
          transactionDate = new Date().toISOString();
        } else {
          const now = new Date();
          receiptDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          transactionDate = receiptDate.toISOString();
        }
      } catch {
        transactionDate = new Date().toISOString();
      }
      
      const spentItemsToAdd = receiptData.items.map((item: any) => ({
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
      await loadCurrentMonth();
      
      // Deduct total from selected payment method
      if (account?.type === 'BANK') {
        const newBalance = account.balance - receiptData.total;
        if (newBalance < 0) {
          alert('Warning: Bank account balance will be negative!');
        }
        await updateBank(account.id, account.name, newBalance);
        
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
        
        if (Number(walletBankEntry.total) < receiptData.total) {
          alert(`Error: Insufficient funds in wallet. Wallet has ${Number(walletBankEntry.total).toLocaleString()} GYD, but ${receiptData.total.toLocaleString()} GYD is needed.`);
          return;
        }
        
        const newBalance = Number(walletBankEntry.total) - receiptData.total;
        if (newBalance < 0) {
          alert('Warning: Wallet balance will be negative!');
        }
        await updateBank(walletBankEntry.id, walletBankEntry.bank_name, newBalance);
        
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
      
      alert('Receipt scanned and saved successfully!');
      navigate('/spending');
    } catch (err) {
      alert('Failed to save receipt: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
              onClick={() => navigate(item.path)}
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
          {/* User Info */}
          <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.email?.split('@')[0] || user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || 'Not signed in'}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setUser(null);
                navigate('/', { replace: true });
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center">
            &copy; 2025 Stashway
          </p>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full">
         {/* Mobile Header */}
         <div className="md:hidden mb-6">
           <div className="flex items-center justify-between mb-4">
             <h1 className="text-xl font-bold text-slate-900">Stashway</h1>
            <div className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">GYD</div>
           </div>
           <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                 <User className="w-5 h-5 text-white" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold text-slate-900 truncate">
                   {user?.email?.split('@')[0] || user?.user_metadata?.full_name || 'User'}
                 </p>
                 <p className="text-xs text-slate-500 truncate">
                   {user?.email || 'Not signed in'}
                 </p>
               </div>
             </div>
             <button
               onClick={async () => {
                 await supabase.auth.signOut();
                 setUser(null);
                 navigate('/', { replace: true });
               }}
               className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
               title="Sign Out"
             >
               <LogOut className="w-5 h-5" />
             </button>
           </div>
         </div>

         <ProtectedRoute>
           <Routes>
             <Route path="/overview" element={
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
             } />
             
             <Route path="/funds" element={
               <Accounts 
                 wallet={wallet}
                 walletBalance={cashBalance}
                 walletTransactions={[]}
                 walletFundsOut={fundsOutTransactions
                   .filter(txn => txn.source_account_type === 'CASH_WALLET')
                   .map(txn => ({
                     id: txn.id,
                     amount: Number(txn.amount),
                     transaction_datetime: txn.transaction_datetime,
                     source: txn.source,
                   }))}
                 fundsOutTransactions={fundsOutTransactions}
                 accounts={banks.map(bank => ({
                   id: bank.id,
                   name: bank.bank_name,
                   type: bank.bank_name === 'Cash Wallet' ? 'CASH_WALLET' as const : 'BANK' as const,
                   balance: Number(bank.total)
                 }))}
                 bankTransactions={fundsInTransactions.map(txn => ({
                   id: txn.destination_account_id,
                   txnId: txn.id,
                   amount: Number(txn.amount),
                   source: txn.source,
                   datetime: txn.datetime,
                   type: 'deposit' as const
                 }))}
                 walletTransactionsForBanks={[]}
                 onAddAccount={handleAddBank}
                 onRemoveAccount={handleDeleteBank}
                 onAddFunds={handleAddBankFunds}
                 onAddWalletFunds={handleAddWalletFunds}
               />
             } />
             
             <Route path="/scan" element={
               (() => {
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
                     onSave={handleSaveTransaction}
                   />
                 );
               })()
             } />
             
             <Route path="/spending" element={
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
                 onUpdateSpend={async (id, updates) => {
                   try {
                     const originalItem = spentItems.find(item => item.id === id);
                     if (!originalItem) {
                       throw new Error('Item not found');
                     }

                     const newAmount = updates.itemTotal !== undefined ? updates.itemTotal : originalItem.itemTotal;
                     const paymentMethod = updates.paymentMethod !== undefined ? updates.paymentMethod : originalItem.paymentMethod;
                     
                     if (paymentMethod) {
                       const isWallet = paymentMethod === 'Cash Wallet';
                       const walletBankEntry = banks.find(bank => bank.bank_name === 'Cash Wallet');
                       const account = isWallet 
                         ? walletBankEntry 
                         : banks.find(bank => bank.bank_name === paymentMethod);
                       
                       if (isWallet && walletBankEntry) {
                         const amountDifference = newAmount - originalItem.itemTotal;
                         if (amountDifference > 0 && Number(walletBankEntry.total) < amountDifference) {
                           alert(`Error: Insufficient funds in wallet. Wallet has ${Number(walletBankEntry.total).toLocaleString()} GYD, but ${amountDifference.toLocaleString()} GYD additional is needed.`);
                           return;
                         }
                       } else if (account && !isWallet) {
                         const amountDifference = newAmount - originalItem.itemTotal;
                         if (amountDifference > 0 && Number(account.total) < amountDifference) {
                           alert(`Error: Insufficient funds in ${account.bank_name}. Account has ${Number(account.total).toLocaleString()} GYD, but ${amountDifference.toLocaleString()} GYD additional is needed.`);
                           return;
                         }
                       }
                     }

                     await updateSpentItem(id, updates);

                     const fundsOutEntry = fundsOutTransactions.find(
                       txn => txn.spent_table_id === id
                     );

                     if (fundsOutEntry) {
                       const finalPaymentMethod = updates.paymentMethod !== undefined ? updates.paymentMethod : originalItem.paymentMethod;
                       const finalAmount = updates.itemTotal !== undefined ? updates.itemTotal : originalItem.itemTotal;
                       const finalDateTime = updates.transactionDateTime !== undefined ? updates.transactionDateTime : originalItem.transactionDateTime;
                       const finalSource = updates.source !== undefined ? updates.source : originalItem.source;
                       
                       if (finalPaymentMethod) {
                         const isWallet = finalPaymentMethod === 'Cash Wallet';
                         const walletBankEntry = banks.find(bank => bank.bank_name === 'Cash Wallet');
                         const account = isWallet 
                           ? walletBankEntry 
                           : banks.find(bank => bank.bank_name === finalPaymentMethod);
                         
                         if (account) {
                           const oldAmount = originalItem.itemTotal;
                           const newAmount = finalAmount;
                           const difference = newAmount - oldAmount;
                           
                           if (difference !== 0) {
                             const newBalance = Number(account.total) - difference;
                             await updateBank(account.id, account.bank_name, newBalance);
                           }

                           await updateFundsOutBySpentTableId(id, {
                             source_account_id: account.id,
                             source_account_type: isWallet ? 'CASH_WALLET' : 'BANK',
                             source_account_name: isWallet ? 'Cash Wallet' : account.bank_name,
                             amount: finalAmount,
                             transaction_datetime: finalDateTime,
                             source: finalSource,
                           });
                         }
                       }
                     }
                   } catch (err) {
                     alert('Failed to update spending: ' + (err instanceof Error ? err.message : 'Unknown error'));
                   }
                 }}
                 onAddSpend={async (item) => {
                   try {
                     if (item.paymentMethod) {
                       const isWallet = item.paymentMethod === 'Cash Wallet';
                       const walletBankEntry = banks.find(bank => bank.bank_name === 'Cash Wallet');
                       const account = isWallet 
                         ? walletBankEntry 
                         : banks.find(bank => bank.bank_name === item.paymentMethod);
                       
                       if (isWallet && walletBankEntry) {
                         if (Number(walletBankEntry.total) < item.itemTotal) {
                           alert(`Error: Insufficient funds in wallet. Wallet has ${Number(walletBankEntry.total).toLocaleString()} GYD, but ${item.itemTotal.toLocaleString()} GYD is needed.`);
                           return;
                         }
                       } else if (account && !isWallet) {
                         if (Number(account.total) < item.itemTotal) {
                           alert(`Error: Insufficient funds in ${account.bank_name}. Account has ${Number(account.total).toLocaleString()} GYD, but ${item.itemTotal.toLocaleString()} GYD is needed.`);
                           return;
                         }
                       }
                     }
                     
                     const addedItems = await addSpentItems([item]);
                     await loadCurrentMonth();
                     
                     if (item.paymentMethod) {
                       const isWallet = item.paymentMethod === 'Cash Wallet';
                       const walletBankEntry = banks.find(bank => bank.bank_name === 'Cash Wallet');
                       const account = isWallet 
                         ? walletBankEntry 
                         : banks.find(bank => bank.bank_name === item.paymentMethod);
                       
                       if (isWallet && walletBankEntry) {
                         const newBalance = Number(walletBankEntry.total) - item.itemTotal;
                         if (newBalance < 0) {
                           alert('Warning: Wallet balance will be negative!');
                         }
                         await updateBank(walletBankEntry.id, walletBankEntry.bank_name, newBalance);
                         
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
                         const newBalance = Number(account.total) - item.itemTotal;
                         if (newBalance < 0) {
                           alert('Warning: Bank account balance will be negative!');
                         }
                         await updateBank(account.id, account.bank_name, newBalance);
                         
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
             } />
             
             <Route path="*" element={<Navigate to="/overview" replace />} />
           </Routes>
         </ProtectedRoute>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
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