import React, { useState } from 'react';
import { BankAccount, CashWallet, CashDenominations } from '../types';
import { Building2, Plus, Trash2, ArrowDownToLine, X, ChevronRight, ArrowLeft, Wallet } from 'lucide-react';
import { GYD_DENOMINATIONS } from '../constants';

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
  note_5000: number;
  note_2000: number;
  note_1000: number;
  note_500: number;
  note_100: number;
  note_50: number;
  note_20: number;
  datetime: string;
}

interface AccountsProps {
  wallet: CashWallet | null;
  walletTransactions?: WalletTransaction[];
  accounts: BankAccount[];
  bankTransactions?: BankTransaction[];
  walletTransactionsForBanks?: Array<{ id: string; source: string; total: number; datetime: string }>;
  onAddAccount: (name: string, initialBalance: number) => void;
  onRemoveAccount: (id: string) => void;
  onAddFunds?: (bankId: string, amount: number, source: string) => void;
  onAddWalletFunds?: (source: string, denominations: CashDenominations) => void;
}

export const Accounts: React.FC<AccountsProps> = ({ 
  wallet, 
  walletTransactions = [], 
  accounts, 
  bankTransactions = [], 
  walletTransactionsForBanks = [],
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
  const [walletFundDenominations, setWalletFundDenominations] = useState<CashDenominations>({
    5000: 0, 2000: 0, 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0
  });

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
    setWalletFundDenominations({
      5000: 0, 2000: 0, 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0
    });
  };

  const handleSubmitWalletFunds = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Object.entries(walletFundDenominations).reduce(
      (sum, [denom, count]) => sum + Number(denom) * Number(count),
      0
    );
    if (walletFundSource && total > 0 && onAddWalletFunds) {
      onAddWalletFunds(walletFundSource, walletFundDenominations);
      handleCloseWalletAddFunds();
    }
  };

  const updateWalletFundDenomination = (denom: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setWalletFundDenominations(prev => ({
      ...prev,
      [denom]: Math.max(0, numValue)
    }));
  };

  const calculateWalletTotal = () => {
    if (!wallet) return 0;
    return Object.entries(wallet.denominations).reduce(
      (sum, [denom, count]) => sum + Number(denom) * Number(count),
      0
    );
  };

  // Get transactions for specific bank (both deposits and withdrawals)
  const getBankTransactions = (bank: BankAccount) => {
    // Get deposits (bank_in transactions)
    const deposits = bankTransactions
      .filter(txn => txn.id === bank.id)
      .map(txn => ({ ...txn, type: 'deposit' as const }));

    // Get withdrawals (wallet_in transactions where source matches bank name)
    const withdrawals = walletTransactionsForBanks
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
    return [...deposits, ...withdrawals].sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );
  };

  // If viewing wallet details, show detail view
  if (viewingWallet && wallet) {
    const sortedTransactions = [...walletTransactions].sort(
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
                ${calculateWalletTotal().toLocaleString()} <span className="text-lg text-slate-500">GYD</span>
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
                const denominationBreakdown = [
                  txn.note_5000 > 0 && `${txn.note_5000}× $5000`,
                  txn.note_2000 > 0 && `${txn.note_2000}× $2000`,
                  txn.note_1000 > 0 && `${txn.note_1000}× $1000`,
                  txn.note_500 > 0 && `${txn.note_500}× $500`,
                  txn.note_100 > 0 && `${txn.note_100}× $100`,
                  txn.note_50 > 0 && `${txn.note_50}× $50`,
                  txn.note_20 > 0 && `${txn.note_20}× $20`,
                ].filter(Boolean).join(', ');

                return (
                  <div key={txn.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Funds Added</p>
                        <p className="text-sm text-slate-500">From: {txn.source}</p>
                        {denominationBreakdown && (
                          <p className="text-xs text-slate-400 mt-1">
                            {denominationBreakdown}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(txn.datetime).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">
                          +${txn.total.toLocaleString()}
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
        {/* Wallet Card */}
        {wallet && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 group overflow-hidden">
            <div 
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setViewingWallet(true)}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg">Cash Wallet</h3>
                  <p className="text-emerald-600 font-semibold">${calculateWalletTotal().toLocaleString()} GYD</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            
            {/* Add Funds Button */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenWalletAddFunds();
                }}
                className="w-full bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Add Funds
              </button>
            </div>
          </div>
        )}

        {/* Bank Account Cards */}
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white rounded-xl shadow-sm border border-slate-100 group overflow-hidden">
             <div 
               className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
               onClick={() => setViewingBank(acc)}
             >
               <div className="flex items-center gap-4 flex-1">
                 <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                   <Building2 className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                   <h3 className="font-bold text-slate-800 text-lg">{acc.name}</h3>
                   <p className="text-emerald-600 font-semibold">${acc.balance.toLocaleString()} GYD</p>
                 </div>
                 <ChevronRight className="w-5 h-5 text-slate-400" />
               </div>
               
               <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAccount(acc.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 ml-2"
                  title="Remove Account"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
             </div>
             
             {/* Add Funds Button */}
             <div className="mt-4 pt-4 border-t border-slate-100">
               <button
                 onClick={() => handleOpenAddFunds(acc)}
                 className="w-full bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
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

              {/* Denomination Inputs */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Cash Received (by denomination)
                </label>
                <div className="space-y-3">
                  {GYD_DENOMINATIONS.map((denom) => (
                    <div key={denom} className="flex items-center justify-between gap-4">
                      <label className="font-semibold text-slate-700 min-w-[80px]">
                        ${denom}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={walletFundDenominations[denom] || 0}
                        onChange={(e) => updateWalletFundDenomination(denom, e.target.value)}
                        className="w-24 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black text-center font-mono"
                      />
                      <span className="text-slate-600 font-medium min-w-[100px] text-right">
                        = ${((walletFundDenominations[denom] || 0) * denom).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Display */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-800">Total Amount:</span>
                  <span className="text-2xl font-bold text-emerald-700">
                    ${Object.entries(walletFundDenominations).reduce(
                      (sum, [denom, count]) => sum + Number(denom) * Number(count),
                      0
                    ).toLocaleString()} GYD
                  </span>
                </div>
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
                  disabled={!walletFundSource || Object.entries(walletFundDenominations).reduce(
                    (sum, [denom, count]) => sum + Number(denom) * Number(count),
                    0
                  ) === 0}
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