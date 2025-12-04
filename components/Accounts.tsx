import React, { useState } from 'react';
import { BankAccount } from '../types';
import { Building2, Plus, Trash2, ArrowDownToLine, X } from 'lucide-react';

interface AccountsProps {
  accounts: BankAccount[];
  onAddAccount: (name: string, initialBalance: number) => void;
  onRemoveAccount: (id: string) => void;
  onAddFunds?: (bankId: string, amount: number, source: string) => void;
}

export const Accounts: React.FC<AccountsProps> = ({ accounts, onAddAccount, onRemoveAccount, onAddFunds }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  
  // Add Funds modal state
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundSource, setFundSource] = useState('');

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

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Bank Accounts</h2>
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
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 group">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                   <Building2 className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-800 text-lg">{acc.name}</h3>
                   <p className="text-emerald-600 font-semibold">${acc.balance.toLocaleString()} GYD</p>
                 </div>
               </div>
               
               <button 
                  onClick={() => onRemoveAccount(acc.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
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
    </div>
  );
};