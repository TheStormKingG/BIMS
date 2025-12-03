import React from 'react';
import { GYD_DENOMINATIONS } from '../constants';
import { CashWallet as CashWalletType, CashDenominations } from '../types';
import { Plus, Minus, Wallet } from 'lucide-react';

interface CashWalletProps {
  wallet: CashWalletType;
  onUpdate: (denominations: CashDenominations) => void;
}

export const CashWallet: React.FC<CashWalletProps> = ({ wallet, onUpdate }) => {
  const totalValue = Object.entries(wallet.denominations).reduce(
    (sum, [denom, count]) => sum + Number(denom) * Number(count),
    0
  );

  const handleIncrement = (denom: number) => {
    onUpdate({
      ...wallet.denominations,
      [denom]: (wallet.denominations[denom] || 0) + 1,
    });
  };

  const handleDecrement = (denom: number) => {
    const current = wallet.denominations[denom] || 0;
    if (current > 0) {
      onUpdate({
        ...wallet.denominations,
        [denom]: current - 1,
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-emerald-700 text-white p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-2 opacity-80">
          <Wallet className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Physical Wallet</span>
        </div>
        <div className="text-4xl font-bold">
          ${totalValue.toLocaleString()} <span className="text-lg font-normal opacity-75">GYD</span>
        </div>
        <p className="text-emerald-100 text-sm mt-2">
          Calculated by counting your physical notes.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-700">Bill Counter</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {GYD_DENOMINATIONS.map((denom) => {
            const count = wallet.denominations[denom] || 0;
            const subtotal = count * denom;
            
            return (
              <div key={denom} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-lg">${denom}</span>
                  <span className="text-xs text-slate-500">Subtotal: ${subtotal.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleDecrement(denom)}
                    className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                    disabled={count === 0}
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  
                  <span className="w-8 text-center font-mono font-medium text-lg text-slate-900">
                    {count}
                  </span>

                  <button
                    onClick={() => handleIncrement(denom)}
                    className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 hover:bg-emerald-200 active:bg-emerald-300 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};