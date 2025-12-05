import React, { useState } from 'react';
import { BankAccount, CashWallet } from '../types';
import { Building2, Plus, Trash2, ArrowDownToLine, X, ChevronRight, ArrowLeft, Wallet } from 'lucide-react';

interface BankTransaction {
  id: string; // This is the bank_id (destination)
  txnId?: string; // Optional transaction ID for unique key
  amount: number;
  source: string;
  datetime: string;
  type: 'deposit' | 'withdrawal';
}

interface WalletTransaction {
  id: string;
  source: string;
  total: number;
  datetime: string;
}

interface WalletFundsOut {
  id: string;
  amount: number;
  transaction_datetime: string;
  source: string;
}

interface FundsOutTransaction {
  id: string;
  source_account_id: string;
  source_account_type: 'BANK' | 'CASH_WALLET';
  source_account_name: string;
  amount: number;
  transaction_datetime: string;
  spent_table_id: string | null;
  source: 'SCAN_RECEIPT' | 'MANUAL' | 'IMPORT_EMAIL' | 'IMPORT_SMS';
  created_at: string;
}

interface AccountsProps {
  wallet: CashWallet | null;
  walletTransactions?: WalletTransaction[];
  walletFundsOut?: WalletFundsOut[];
  accounts: BankAccount[];
  bankTransactions?: BankTransaction[];
  walletTransactionsForBanks?: Array<{ id: string; source: string; total: number; datetime: string }>;
  fundsOutTransactions?: FundsOutTransaction[];
  onAddAccount: (name: string, initialBalance: number) => void;
  onRemoveAccount: (id: string) => void;
  onAddFunds?: (bankId: string, amount: number, source: string) => void;
  onAddWalletFunds?: (source: string, amount: number) => void;
  walletBalance?: number;
}

export const Accounts: React.FC<AccountsProps> = ({ 
  wallet, 
  walletTransactions = [],
  walletFundsOut = [],
  walletBalance = 0,
  accounts, 
  bankTransactions = [], 
  walletTransactionsForBanks = [],
  fundsOutTransactions = [],
  onAddAccount, 
  onRemoveAccount, 
  onAddFunds,
  onAddWalletFunds 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  
  // Add Funds modal state
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundSource, setFundSource] = useState('');

  // Wallet Add Funds modal state
  const [showWalletAddFundsModal, setShowWalletAddFundsModal] = useState(false);
  const [walletFundSource, setWalletFundSource] = useState('');
  const [walletFundAmount, setWalletFundAmount] = useState('');

  // Detail view state
  const [viewingBank, setViewingBank] = useState<BankAccount | null>(null);
  const [viewingWallet, setViewingWallet] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newBalance) {
      onAddAccount(newName, Number(newBalance));
      setNewName('');
      setNewBalance('');
      setIsAdding(false);
    }
  };

  const handleOpenAddFunds = (bank: BankAccount) => {
    setSelectedBank(bank);
    setShowAddFundsModal(true);
  };

  const handleCloseAddFunds = () => {
    setShowAddFundsModal(false);
    setSelectedBank(null);
    setFundAmount('');
    setFundSource('');
  };

  const handleSubmitFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBank && fundAmount && fundSource && onAddFunds) {
      onAddFunds(selectedBank.id, Number(fundAmount), fundSource);
      handleCloseAddFunds();
    }
  };

  // Wallet handlers
  const handleOpenWalletAddFunds = () => {
    setShowWalletAddFundsModal(true);
  };

  const handleCloseWalletAddFunds = () => {
    setShowWalletAddFundsModal(false);
    setWalletFundSource('');
    setWalletFundAmount('');
  };

  const handleSubmitWalletFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (walletFundSource && walletFundAmount && Number(walletFundAmount) > 0 && onAddWalletFunds) {
      onAddWalletFunds(walletFundSource, Number(walletFundAmount));
      handleCloseWalletAddFunds();
    }
  };

  // Get transactions for specific bank (both deposits and withdrawals)
  const getBankTransactions = (bank: BankAccount) => {
    // Get deposits (bank_in transactions)
    const deposits = bankTransactions
      .filter(txn => txn.id === bank.id)
      .map(txn => ({ ...txn, type: 'deposit' as const }));

    // Get withdrawals from funds_out table (spending transactions)
    const fundsOutWithdrawals = fundsOutTransactions
      .filter(txn => txn.source_account_id === bank.id && txn.source_account_type === 'BANK')
      .map(txn => ({
        id: bank.id,
        txnId: txn.id,
        amount: Number(txn.amount),
        source: txn.source === 'SCAN_RECEIPT' ? 'Receipt Scan' : 
                txn.source === 'MANUAL' ? 'Manual Entry' :
                txn.source === 'IMPORT_EMAIL' ? 'Email Import' : 'SMS Import',
        datetime: txn.transaction_datetime,
        type: 'withdrawal' as const
      }));

    // Get withdrawals (wallet_in transactions where source matches bank name) - legacy
    const walletWithdrawals = walletTransactionsForBanks
      .filter(txn => txn.source === bank.name)
      .map(txn => ({
        id: bank.id,
        txnId: txn.id,
        amount: txn.total,
        source: 'Wallet',
        datetime: txn.datetime,
        type: 'withdrawal' as const
      }));

    // Combine and sort by datetime (newest first)
    return [...deposits, ...fundsOutWithdrawals, ...walletWithdrawals].sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );
  };

  // If viewing wallet details, show detail view
  // Get Cash Wallet from accounts list
  const cashWalletAccount = accounts.find(acc => acc.name === 'Cash Wallet' && acc.type === 'CASH_WALLET');
  
  if (viewingWallet && (wallet || cashWalletAccount)) {
    // Combine bank_in (funds added) and funds_out (cash spent) transactions
    // Get wallet bank entry to find its transactions
    const walletBank = accounts.find(acc => acc.name === 'Cash Wallet');
    const fundsAdded = walletBank 
      ? bankTransactions
          .filter(txn => txn.id === walletBank.id)
          .map(txn => ({
            id: txn.txnId || txn.id,
            type: 'funds_added' as const,
            amount: txn.amount,
            source: txn.source,
            datetime: txn.datetime,
            denominationBreakdown: null,
          }))
      : [];

    const cashSpent = walletFundsOut.map(txn => ({
      id: txn.id,
      type: 'cash_spent' as const,
      amount: txn.amount,
      source: txn.source,
      datetime: txn.transaction_datetime,
      denominationBreakdown: null,
    }));

    const sortedTransactions = [...fundsAdded, ...cashSpent].sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );

    return (
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Back Button */}
        <button
          onClick={() => setViewingWallet(false)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to All Funds
        </button>

        {/* Wallet Header Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Cash Wallet</h2>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                ${(cashWalletAccount?.balance || walletBalance || 0).toLocaleString()} <span className="text-lg text-slate-500">GYD</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenWalletAddFunds}
            className="w-full bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Add Funds
          </button>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700">Transaction History</h3>
          </div>
          
          {sortedTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedTransactions.map((txn) => {
                return (
                  <div key={txn.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {txn.type === 'funds_added' ? 'Funds Added' : 'Cash Spent'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {txn.type === 'funds_added' ? `From: ${txn.source}` : `Source: ${txn.source}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(txn.datetime).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          txn.type === 'funds_added' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {txn.type === 'funds_added' ? '+' : '-'}${txn.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // If viewing a bank's details, show detail view
  if (viewingBank) {
    const transactions = getBankTransactions(viewingBank);

    return (
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Back Button */}
        <button
          onClick={() => setViewingBank(null)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to All Accounts
        </button>

        {/* Bank Header Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{viewingBank.name}</h2>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                ${viewingBank.balance.toLocaleString()} <span className="text-lg text-slate-500">GYD</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddFunds(viewingBank)}
            className="w-full bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Add Funds
          </button>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-700">Transaction History</h3>
          </div>
          
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map((txn, index) => (
                <div key={txn.txnId || `${txn.id}-${index}`} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {txn.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {txn.type === 'deposit' ? `From: ${txn.source}` : `To: ${txn.source}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(txn.datetime).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        txn.type === 'deposit' 
                          ? 'text-emerald-600' 
                          : 'text-red-600'
                      }`}>
                        {txn.type === 'deposit' ? '+' : '-'}${txn.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main accounts list view
  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Funds</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-emerald-100">
          <h3 className="font-semibold text-slate-800 mb-4">New Bank Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Bank / Account Name</label>
               <input 
                 type="text" 
                 placeholder="e.g. Republic Bank Savings"
                 value={newName}
                 onChange={e => setNewName(e.target.value)}
                 className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                 required
               />
             </div>
             <div>
               <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Current Balance (GYD)</label>
               <input 
                 type="number" 
                 placeholder="0.00"
                 value={newBalance}
                 onChange={e => setNewBalance(e.target.value)}
                 className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                 required
               />
             </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
             <button 
               type="button" 
               onClick={() => setIsAdding(false)} 
               className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium"
             >
               Cancel
             </button>
             <button 
               type="submit"
               className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800"
             >
               Save Account
             </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {/* Wallet Card - Show Cash Wallet from accounts list first */}
        {accounts.filter(acc => acc.name === 'Cash Wallet' && acc.type === 'CASH_WALLET').map(walletAcc => (
          <div key={walletAcc.id} className="bg-slate-800 rounded-xl shadow-lg group overflow-hidden">
            <div 
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors"
              onClick={() => setViewingWallet(true)}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg">Cash Wallet</h3>
                  <p className="text-slate-300 font-semibold text-base">${walletAcc.balance.toLocaleString()} GYD</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            
            {/* Add Funds Button */}
            <div className="px-6 pb-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenWalletAddFunds();
                }}
                className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Add Funds
              </button>
            </div>
          </div>
        ))}

        {/* Bank Account Cards - Exclude Cash Wallet */}
        {accounts.filter(acc => acc.name !== 'Cash Wallet').map(acc => (
          <div key={acc.id} className="bg-slate-800 rounded-xl shadow-lg group overflow-hidden">
             <div 
               className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors"
               onClick={() => setViewingBank(acc)}
             >
               <div className="flex items-center gap-4 flex-1">
                 <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
                   <Building2 className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                   <h3 className="font-bold text-white text-lg">{acc.name}</h3>
                   <p className="text-slate-300 font-semibold text-base">${acc.balance.toLocaleString()} GYD</p>
                 </div>
                 <ChevronRight className="w-5 h-5 text-slate-400" />
               </div>
               
               <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAccount(acc.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-full transition-colors opacity-0 group-hover:opacity-100 ml-2"
                  title="Remove Account"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
             </div>
             
             {/* Add Funds Button */}
             <div className="px-6 pb-6">
               <button
                 onClick={() => handleOpenAddFunds(acc)}
                 className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
               >
                 <ArrowDownToLine className="w-4 h-4" />
                 Add Funds
               </button>
             </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
             No bank accounts added yet.
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      {showAddFundsModal && selectedBank && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseAddFunds}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Add Funds</h3>
              <button
                onClick={handleCloseAddFunds}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500 mb-1">Destination Bank</p>
              <p className="font-semibold text-slate-900">{selectedBank.name}</p>
              <p className="text-sm text-emerald-600 mt-1">Current: ${selectedBank.balance.toLocaleString()} GYD</p>
            </div>

            <form onSubmit={handleSubmitFunds} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (GYD)
                </label>
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black text-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Source
                </label>
                <input
                  type="text"
                  value={fundSource}
                  onChange={(e) => setFundSource(e.target.value)}
                  placeholder="e.g. Salary, Transfer from Cash, Business Income"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                  required
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseAddFunds}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Add Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet Add Funds Modal */}
      {showWalletAddFundsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseWalletAddFunds}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Add Funds to Wallet</h3>
              <button
                onClick={handleCloseWalletAddFunds}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitWalletFunds} className="p-6 space-y-6">
              {/* Source Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Source <span className="text-red-500">*</span>
                </label>
                <select
                  value={walletFundSource}
                  onChange={(e) => setWalletFundSource(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                  required
                >
                  <option value="">Select source...</option>
                  <option value="Cash-In (Payments, Gifts, Etc.)">Cash-In (Payments, Gifts, Etc.)</option>
                  {accounts.length > 0 && (
                    <optgroup label="From Bank Account">
                      {accounts.map(bank => (
                        <option key={bank.id} value={bank.name}>
                          {bank.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {walletFundSource && walletFundSource !== 'Cash-In (Payments, Gifts, Etc.)' && (
                  <p className="mt-2 text-xs text-slate-500">
                    💡 Withdrawing from {walletFundSource}
                  </p>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (GYD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={walletFundAmount}
                  onChange={(e) => setWalletFundAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black text-lg"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseWalletAddFunds}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!walletFundSource || !walletFundAmount || Number(walletFundAmount) <= 0}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Add Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};