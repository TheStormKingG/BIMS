import React, { useState } from 'react';
import { BankAccount } from '../types';
import { Building2, Plus, Trash2 } from 'lucide-react';

interface AccountsProps {
  accounts: BankAccount[];
  onAddAccount: (name: string, initialBalance: number) => void;
  onRemoveAccount: (id: string) => void;
}

export const Accounts: React.FC<AccountsProps> = ({ accounts, onAddAccount, onRemoveAccount }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newBalance) {
      onAddAccount(newName, Number(newBalance));
      setNewName('');
      setNewBalance('');
      setIsAdding(false);
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
          <div key={acc.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group">
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
        ))}
        {accounts.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
             No bank accounts added yet.
          </div>
        )}
      </div>
    </div>
  );
};