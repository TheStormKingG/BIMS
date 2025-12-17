import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { Accounts } from './components/Accounts';
import { Spending } from './components/Spending';
import { Scanner } from './components/Scanner';
import { Upload } from './components/Upload';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import { Goals } from './components/Goals';
import { GoalModal } from './components/GoalModal';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsAndConditions } from './components/TermsAndConditions';
import { SettingsPrivacy } from './components/SettingsPrivacy';
import { SettingsTerms } from './components/SettingsTerms';
import { useWallet } from './hooks/useWallet';
import { useBanks } from './hooks/useBanks';
import { useSpentItems } from './hooks/useSpentItems';
import { useGoals } from './hooks/useGoals';
import { addFundsOut, updateFundsOutBySpentTableId } from './services/fundsOutDatabase';
import { getSupabase } from './services/supabaseClient';
import { saveReceipt } from './services/receiptService';
import { LogOut, User, ScanLine, Camera, Image, Settings as SettingsIcon } from 'lucide-react';

function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showScanModal, setShowScanModal] = useState(false);
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
    archivedBanks,
    fundsInTransactions,
    fundsOutTransactions,
    totalInBanks,
    loading: banksLoading,
    error: banksError,
    addBank,
    updateBank,
    deleteBank,
    archiveBank,
    unarchiveBank,
    addFundsInTransaction,
  } = useBanks();

  // Use spent items hook
  const {
    spentItems,
    loading: spentItemsLoading,
    error: spentItemsError,
    addSpentItems,
    updateItem: updateSpentItem,
    deleteItem: deleteSpentItemFromHook,
    loadCurrentMonth,
    refresh: loadSpentItems,
  } = useSpentItems();

  // Use goals hook
  const {
    goals,
    loading: goalsLoading,
    error: goalsError,
    addGoal,
    editGoal,
    removeGoal,
    toggleGoalActive,
  } = useGoals(spentItems, totalInBanks);

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
        if (location.pathname === '/') {
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

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/privacy', '/terms'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  // If not authenticated and not on a public route, show login
  if (!user && !isPublicRoute) {
    return <Navigate to="/" replace />;
  }

  // Handle public routes - render without authentication and without navigation
  if (!user && isPublicRoute) {
    return (
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/" element={
          <Login onLoginSuccess={async () => {
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
          }} />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // If authenticated and on login page, redirect to overview
  if (user && location.pathname === '/') {
    return <Navigate to="/overview" replace />;
  }

  // Show login page if not authenticated (should not reach here if isPublicRoute is true)
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
    if (path === '/goals' || path.startsWith('/goals')) return 'goals';
    if (path === '/settings' || path.startsWith('/settings')) return 'settings';
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
  const handleSaveTransaction = async (receiptData: any, accountId: string, file?: File) => {
    try {
      console.log('handleSaveTransaction called with:', { receiptData, accountId, hasFile: !!file });
      
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
      if (!account) {
        throw new Error(`Account with ID ${accountId} not found`);
      }
      const paymentMethod = account.type === 'CASH_WALLET' ? 'Cash Wallet' : account.name || 'Unknown';
      
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
      
      if (!receiptData.items || !Array.isArray(receiptData.items) || receiptData.items.length === 0) {
        throw new Error('Receipt data has no items to save');
      }
      
      const spentItemsToAdd = receiptData.items.map((item: any) => ({
        transactionDateTime: transactionDate,
        category: item.category || 'Other',
        item: item.description || 'Unknown item',
        itemCost: Number(item.unitPrice) || 0,
        itemQty: Number(item.quantity) || 1,
        itemTotal: Number(item.total) || 0,
        paymentMethod: paymentMethod,
        source: 'SCAN_RECEIPT' as const,
      }));
      
      console.log('Adding spent items:', spentItemsToAdd);
      const addedSpentItems = await addSpentItems(spentItemsToAdd);
      console.log('Successfully added spent items:', addedSpentItems);
      
      // Save receipt image if file is provided (for scanned receipts)
      if (file && addedSpentItems.length > 0) {
        try {
          console.log('Saving receipt image for spent_table_id:', addedSpentItems[0].id);
          // Use the first spent_table entry ID to link the receipt
          const receiptId = await saveReceipt(file, addedSpentItems[0].id, receiptData);
          console.log('Successfully saved receipt image, receipt ID:', receiptId);
        } catch (receiptError) {
          console.error('Failed to save receipt image:', receiptError);
          console.error('Receipt error details:', receiptError);
          // Don't fail the entire transaction if receipt save fails
          // The transaction data is already saved, receipt image is optional
        }
      } else {
        console.log('Skipping receipt image save:', { hasFile: !!file, hasItems: addedSpentItems.length > 0 });
      }
      
      // Refresh spent items (load all, not just current month)
      await loadSpentItems();
      
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
      
      console.log('Transaction saved successfully, navigating to spending page');
      alert('Receipt scanned and saved successfully!');
      navigate('/spending');
    } catch (err: any) {
      console.error('Error in handleSaveTransaction:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        stack: err instanceof Error ? err.stack : undefined,
        fullError: err
      });
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : (err?.message || err?.error?.message || 'Unknown error');
      
      const errorDetails = err?.details || err?.hint || '';
      const fullErrorMessage = errorDetails 
        ? `${errorMessage}\n\nDetails: ${errorDetails}`
        : errorMessage;
      
      alert('Failed to save receipt:\n\n' + fullErrorMessage + '\n\nCheck console (F12) for more details.');
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64">
      {/* Desktop Navigation (Sidebar) */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex-col p-6 z-20">
        <div className="flex flex-col items-center gap-2 mb-10">
           <img src="/stashway-logo.png" alt="Stashway" className="w-24 h-24" />
           <h1 className="text-4xl font-bold tracking-tight">Stashway<sup className="text-xs">™</sup></h1>
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
              {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                <img
                  src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
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

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-30 bg-gradient-to-br from-slate-50 to-slate-100 pt-[15px] pb-[8px] px-[15px] mb-[15px] shadow-md">
        <div className="flex items-center justify-between gap-[8px]">
          <div className="flex items-center gap-[8px] flex-shrink-0 min-w-0">
            <img src="/stashway-logo.png" alt="Stashway" className="w-[47.5px] h-[47.5px] flex-shrink-0" />
            <h1 className="text-[22.8px] font-bold text-slate-900 truncate">Stashway<sup className="text-xs">™</sup></h1>
          </div>
          <div className="flex items-center gap-[8px] flex-shrink-0">
            <button
              onClick={() => navigate('/settings', { state: { openPersonalInfo: true } })}
              className="flex items-center gap-[8px] px-[8px] py-[6px] bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md active:shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer"
            >
              {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                <img
                  src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                  alt="Profile"
                  className="w-[26.6px] h-[26.6px] rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-[26.6px] h-[26.6px] rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-[15.2px] h-[15.2px] text-white" />
                </div>
              )}
              <div className="min-w-0 flex-shrink">
                <p className="text-[11.4px] font-semibold text-slate-900 truncate leading-tight">
                  {user?.email?.split('@')[0] || user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-[9.5px] text-slate-500 truncate leading-tight">
                  {user?.email || 'Not signed in'}
                </p>
              </div>
              <svg className="w-[15.2px] h-[15.2px] text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto w-full">
         <Routes>
           {/* Protected routes */}
           <Route path="/overview" element={
             <ProtectedRoute>
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
             </ProtectedRoute>
             } />
             
             <Route path="/funds" element={
               <ProtectedRoute>
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
                 archivedAccounts={archivedBanks.map(bank => ({
                   id: bank.id,
                   name: bank.bank_name,
                   type: 'BANK' as const,
                   balance: Number(bank.total),
                 }))}
                 onAddAccount={handleAddBank}
                 onRemoveAccount={handleDeleteBank}
                 onArchiveAccount={archiveBank}
                 onUnarchiveAccount={unarchiveBank}
                 onAddFunds={handleAddBankFunds}
                 onAddWalletFunds={handleAddWalletFunds}
               />
               </ProtectedRoute>
             } />
             
             <Route path="/scan" element={
               <ProtectedRoute>
                 {(() => {
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
                   
                   // Use Upload component for desktop, Scanner for mobile
                   const isMobile = window.innerWidth < 768;
                   if (isMobile) {
                     return (
                       <Scanner 
                         accounts={allAccounts}
                         onTriggerScan={() => setShowScanModal(true)}
                         onSave={handleSaveTransaction}
                       />
                     );
                   } else {
                     return (
                       <Upload 
                         accounts={allAccounts}
                         onSave={handleSaveTransaction}
                       />
                     );
                   }
                 })()}
               </ProtectedRoute>
             } />

             <Route path="/goals" element={
               <ProtectedRoute>
                 <GoalsPageWrapper
                   goals={goals}
                   spentItems={spentItems}
                   totalBalance={totalInBanks}
                   onAddGoal={async (input) => {
                     await addGoal(input);
                   }}
                   onEditGoal={async (goalId, updates) => {
                     await editGoal(goalId, updates);
                   }}
                   onDeleteGoal={async (goalId) => {
                     await removeGoal(goalId);
                   }}
                   onToggleActive={async (goalId) => {
                     await toggleGoalActive(goalId);
                   }}
                 />
               </ProtectedRoute>
             } />
             
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings user={user} />
              </ProtectedRoute>
            } />
            <Route path="/settings/privacy" element={
              <ProtectedRoute>
                <SettingsPrivacy />
              </ProtectedRoute>
            } />
            <Route path="/settings/terms" element={
              <ProtectedRoute>
                <SettingsTerms />
              </ProtectedRoute>
            } />
            
            <Route path="/spending" element={
              <ProtectedRoute>
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
                 onDeleteSpend={async (id) => {
                   try {
                     const itemToDelete = spentItems.find(item => item.id === id);
                     if (!itemToDelete) {
                       throw new Error('Item not found');
                     }

                     // Find associated funds_out entry
                     const fundsOutEntry = fundsOutTransactions.find(
                       txn => txn.spent_table_id === id
                     );

                     // Delete the spent item (this will update the hook state)
                     await deleteSpentItemFromHook(id);

                     // Reverse the balance change if there's a funds_out entry
                     if (fundsOutEntry && itemToDelete.paymentMethod) {
                       const isWallet = itemToDelete.paymentMethod === 'Cash Wallet';
                       const walletBankEntry = banks.find(bank => bank.bank_name === 'Cash Wallet');
                       const account = isWallet 
                         ? walletBankEntry 
                         : banks.find(bank => bank.bank_name === itemToDelete.paymentMethod);
                       
                       if (account) {
                         // Add the amount back to the account
                         const newBalance = Number(account.total) + itemToDelete.itemTotal;
                         await updateBank(account.id, account.bank_name, newBalance);
                         
                         // Delete the funds_out entry
                         await supabase
                           .from('funds_out')
                           .delete()
                           .eq('id', fundsOutEntry.id);
                       }
                     }
                   } catch (err) {
                     alert('Failed to delete spending: ' + (err instanceof Error ? err.message : 'Unknown error'));
                     throw err;
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
               </ProtectedRoute>
             } />
             
             <Route path="*" element={<Navigate to={user ? "/overview" : "/"} replace />} />
           </Routes>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-between items-end z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {/* Left side items */}
        <div className="flex flex-1 justify-around">
          {NAV_ITEMS.filter(item => item.id !== 'scan' && ['dashboard', 'accounts'].includes(item.id)).map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
                activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-current opacity-20' : ''}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
        
        {/* Special Scan Button - Center, Overlapping */}
        <div className="relative flex justify-center items-end" style={{ width: '20%' }}>
          <button
            onClick={() => setShowScanModal(true)}
            className={`absolute bottom-[15%] w-16 h-16 rounded-full bg-emerald-600 shadow-lg hover:shadow-xl active:shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center z-10 ${
              activeTab === 'scan' ? 'ring-4 ring-emerald-200' : ''
            }`}
          >
            <ScanLine className="w-8 h-8 text-white" strokeWidth={2.5} />
          </button>
        </div>
        
        {/* Right side items */}
        <div className="flex flex-1 justify-around">
          {NAV_ITEMS.filter(item => item.id !== 'scan' && ['expenses', 'goals'].includes(item.id)).map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-2 gap-1 transition-colors ${
                activeTab === item.id ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-current opacity-20' : ''}`} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
        
        {/* Scan Modal Overlay */}
        {showScanModal && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-[60] md:hidden"
              onClick={() => {
                setShowScanModal(false);
                if (location.pathname === '/scan') {
                  navigate('/overview');
                }
              }}
            />
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl z-[61] md:hidden safe-area-bottom">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-6" />
              <div className="px-6 pb-8">
                <h2 className="text-xl font-bold text-white mb-6 text-center">Choose an action</h2>
                <div className="flex gap-6 justify-center">
                  <button
                    onClick={() => {
                      setShowScanModal(false);
                      // Trigger camera input immediately
                      const cameraInput = document.createElement('input');
                      cameraInput.type = 'file';
                      cameraInput.accept = 'image/*';
                      cameraInput.capture = 'environment';
                      let fileSelected = false;
                      cameraInput.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          fileSelected = true;
                          navigate('/scan');
                          // Wait for Scanner component to mount, then trigger file input
                          setTimeout(() => {
                            const scannerInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
                            if (scannerInput) {
                              // Create a DataTransfer to assign the file
                              const dataTransfer = new DataTransfer();
                              dataTransfer.items.add(file);
                              scannerInput.files = dataTransfer.files;
                              // Trigger the change event to analyze the image
                              const changeEvent = new Event('change', { bubbles: true });
                              scannerInput.dispatchEvent(changeEvent);
                            }
                          }, 500);
                        }
                      };
                      cameraInput.click();
                      // If file picker is cancelled, navigate to overview after a short delay
                      setTimeout(() => {
                        if (!fileSelected && location.pathname === '/scan') {
                          navigate('/overview');
                        }
                      }, 300);
                    }}
                    className="flex flex-col items-center gap-3 min-w-[100px] active:scale-95 transition-transform"
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                      <Camera className="w-8 h-8 text-white" strokeWidth={2} />
                    </div>
                    <span className="text-white font-medium text-sm">Camera</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowScanModal(false);
                      // Trigger file picker immediately
                      const fileInput = document.createElement('input');
                      fileInput.type = 'file';
                      fileInput.accept = 'image/*';
                      let fileSelected = false;
                      fileInput.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          fileSelected = true;
                          navigate('/scan');
                          // Wait for Scanner component to mount, then trigger file input
                          setTimeout(() => {
                            const scannerInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
                            if (scannerInput) {
                              // Create a DataTransfer to assign the file
                              const dataTransfer = new DataTransfer();
                              dataTransfer.items.add(file);
                              scannerInput.files = dataTransfer.files;
                              // Trigger the change event to analyze the image
                              const changeEvent = new Event('change', { bubbles: true });
                              scannerInput.dispatchEvent(changeEvent);
                            }
                          }, 500);
                        }
                      };
                      fileInput.click();
                      // If file picker is cancelled, navigate to overview after a short delay
                      setTimeout(() => {
                        if (!fileSelected && location.pathname === '/scan') {
                          navigate('/overview');
                        }
                      }, 300);
                    }}
                    className="flex flex-col items-center gap-3 min-w-[100px] active:scale-95 transition-transform"
                  >
                    <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
                      <Image className="w-8 h-8 text-white" strokeWidth={2} />
                    </div>
                    <span className="text-white font-medium text-sm">Photos and videos</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Goals Page Wrapper Component
const GoalsPageWrapper: React.FC<{
  goals: any[];
  spentItems: any[];
  totalBalance: number;
  onAddGoal: (input: any) => Promise<void>;
  onEditGoal: (goalId: string, updates: any) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onToggleActive: (goalId: string) => Promise<void>;
}> = ({ goals, onAddGoal, onEditGoal, onDeleteGoal, onToggleActive, spentItems }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  
  // Get unique categories from spentItems
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    spentItems.forEach((item: any) => {
      if (item.category) {
        uniqueCategories.add(item.category);
      }
    });
    // Add default categories if not present
    const defaultCategories = ['Groceries', 'Dining Out', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Education', 'Other'];
    defaultCategories.forEach(cat => uniqueCategories.add(cat));
    return Array.from(uniqueCategories).sort();
  }, [spentItems]);

  const handleAddGoal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleSave = async (input: any) => {
    try {
      if (editingGoal) {
        await onEditGoal(editingGoal.id, input);
      } else {
        await onAddGoal(input);
      }
      setIsModalOpen(false);
      setEditingGoal(null);
    } catch (err) {
      console.error('Failed to save goal:', err);
      alert('Failed to save goal. Please try again.');
    }
  };

  return (
    <>
      <Goals
        goals={goals}
        onAddGoal={handleAddGoal}
        onEditGoal={handleEditGoal}
        onDeleteGoal={onDeleteGoal}
        onToggleActive={onToggleActive}
      />
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSave}
        existingGoal={editingGoal}
        categories={categories}
      />
    </>
  );
};

export default App;