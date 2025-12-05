import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { ShoppingBag } from 'lucide-react';

interface SpendingProps {
  transactions: Transaction[];
}

export const Spending: React.FC<SpendingProps> = ({ transactions }) => {
  // Get current month start and end dates
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  // Filter transactions for current month and flatten to line items
  const currentMonthItems = useMemo(() => {
    const { start, end } = getCurrentMonthRange();
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999); // End of day
    
    return transactions
      .filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= startDate && txDate <= endDate;
      })
      .flatMap(tx =>
        tx.items.map((item, index) => ({
          ...item,
          date: tx.date,
          merchant: tx.merchant,
          txId: tx.id,
          itemIndex: index
        }))
      )
      .sort((a, b) => {
        // Sort by date/time descending (newest first)
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        // If same date, sort by merchant then item
        return a.merchant.localeCompare(b.merchant) || a.description.localeCompare(b.description);
      });
  }, [transactions]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentMonthName = new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Spending</h2>
          <p className="text-sm text-slate-500 mt-1">{currentMonthName}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium text-xs border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Date/Time</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-right">Item Cost</th>
                <th className="px-4 py-3 text-right">Item Qty</th>
                <th className="px-4 py-3 text-right">Item Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentMonthItems.length > 0 ? (
                currentMonthItems.map((item, idx) => (
                  <tr key={`${item.txId}-${item.itemIndex}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDateTime(item.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.description}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.merchant}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">
                      ${item.unitPrice.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ${item.total.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingBag className="w-8 h-8 opacity-20" />
                      <p>No spending transactions for {currentMonthName}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

