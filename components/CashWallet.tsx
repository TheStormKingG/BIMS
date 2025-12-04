import React, { useState } from 'react';
import { GYD_DENOMINATIONS } from '../constants';
import { CashWallet as CashWalletType, CashDenominations, BankAccount } from '../types';
import { Wallet, ArrowDownToLine, X } from 'lucide-react';

interface CashWalletProps {
  wallet: CashWalletType;
  banks: BankAccount[];
  onUpdate: (denominations: CashDenominations) => void;
  onAddFunds?: (source: string, denominations: CashDenominations) => void;
}

export const CashWallet: React.FC<CashWalletProps> = ({ wallet, banks, onUpdate, onAddFunds }) => {
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [fundSource, setFundSource] = useState('');
  const [fundDenominations, setFundDenominations] = useState<CashDenominations>({
    5000: 0, 2000: 0, 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0
  });

  const totalValue = Object.entries(wallet.denominations).reduce(
    (sum, [denom, count]) => sum + Number(denom) * Number(count),
    0
  );

  const calculateFundTotal = () => {
    return Object.entries(fundDenominations).reduce(
      (sum, [denom, count]) => sum + Number(denom) * Number(count),
      0
    );
  };

  const handleOpenAddFunds = () => {
    setShowAddFundsModal(true);
  };

  const handleCloseAddFunds = () => {
    setShowAddFundsModal(false);
    setFundSource('');
    setFundDenominations({
      5000: 0, 2000: 0, 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0
    });
  };

  const handleSubmitFunds = (e: React.FormEvent) => {
    e.preventDefault();
    if (fundSource && calculateFundTotal() > 0 && onAddFunds) {
      onAddFunds(fundSource, fundDenominations);
      handleCloseAddFunds();
    }
  };

  const updateFundDenomination = (denom: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setFundDenominations(prev => ({
      ...prev,
      [denom]: Math.max(0, numValue)
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-emerald-700 text-white p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-2 opacity-80">
          <Wallet className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Physical Wallet</span>
        </div>
        <div className="text-4xl font-bold">
          ${totalValue.toLocaleString()} <span className="text-lg font-normal opacity-75">GYD</span>
        </div>
        <p className="text-emerald-100 text-sm mt-2">
          Current cash in your physical wallet.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Cash Balance Breakdown</h3>
        
        <div className="space-y-3 mb-6">
          {GYD_DENOMINATIONS.map((denom) => {
            const count = wallet.denominations[denom] || 0;
            const subtotal = count * denom;
            
            return (
              <div key={denom} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-800">${denom}</span>
                  <span className="text-xs text-slate-400">×</span>
                  <span className="text-sm text-slate-600 font-mono">{count}</span>
                </div>
                <span className="text-slate-700 font-semibold">${subtotal.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleOpenAddFunds}
          className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowDownToLine className="w-4 h-4" />
          Add Funds to Wallet
        </button>
      </div>

      {/* Add Funds Modal */}
      {showAddFundsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseAddFunds}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Add Funds to Wallet</h3>
              <button
                onClick={handleCloseAddFunds}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitFunds} className="p-6 space-y-6">
              {/* Source Dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Source <span className="text-red-500">*</span>
                </label>
                <select
                  value={fundSource}
                  onChange={(e) => setFundSource(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                  required
                >
                  <option value="">Select source...</option>
                  <option value="Cash-In">Cash-In (ATM, Payment, etc.)</option>
                  {banks.length > 0 && (
                    <optgroup label="From Bank Account">
                      {banks.map(bank => (
                        <option key={bank.id} value={bank.name}>
                          {bank.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {fundSource && fundSource !== 'Cash-In' && (
                  <p className="mt-2 text-xs text-slate-500">
                    💡 Withdrawing from {fundSource}
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
                        value={fundDenominations[denom] || 0}
                        onChange={(e) => updateFundDenomination(denom, e.target.value)}
                        className="w-24 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black text-center font-mono"
                      />
                      <span className="text-slate-600 font-medium min-w-[100px] text-right">
                        = ${((fundDenominations[denom] || 0) * denom).toLocaleString()}
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
                    ${calculateFundTotal().toLocaleString()} GYD
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseAddFunds}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!fundSource || calculateFundTotal() === 0}
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