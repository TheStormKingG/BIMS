import React, { useState } from 'react';
import { 
  CashDenominations
} from './types';
import { NAV_ITEMS } from './constants';
import { CashWallet } from './components/CashWallet';
import { useWallet } from './hooks/useWallet';

function App() {
  const [activeTab, setActiveTab] = useState('wallet');
  
  // Use simplified wallet hook
  const {
    wallet,
    cashBalance,
    loading,
    error,
    updateWallet,
  } = useWallet();

  const handleUpdateWallet = async (denoms: CashDenominations) => {
    try {
      await updateWallet(denoms);
    } catch (err) {
      alert('Failed to update wallet: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
            onUpdate={handleUpdateWallet} 
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600">Initializing wallet...</p>
          </div>
        );
      
      case 'dashboard':
      case 'accounts':
      case 'scan':
      case 'expenses':
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
              <p className="text-sm text-slate-500">For now, use the Cash Wallet to track your physical cash.</p>
              <button
                onClick={() => setActiveTab('wallet')}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Go to Wallet
              </button>
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