import React from 'react';
import { SpentItem } from '../services/spentTableDatabase';
import { ShoppingBag } from 'lucide-react';

interface SpendingProps {
  spentItems: SpentItem[];
  loading?: boolean;
}

export const Spending: React.FC<SpendingProps> = ({ spentItems, loading = false }) => {
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

  const formatEntryDate = (dateString: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600">Loading spending data...</p>
        </div>
      </div>
    );
  }

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
                <th className="px-4 py-3 text-left">Transaction Date/Time</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-right">Item Cost</th>
                <th className="px-4 py-3 text-right">Item Qty</th>
                <th className="px-4 py-3 text-right">Item Total</th>
                <th className="px-4 py-3 text-left">Payment Method</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Entry Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spentItems.length > 0 ? (
                spentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDateTime(item.transactionDateTime)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.item}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">
                      ${item.itemCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.itemQty}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ${item.itemTotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.paymentMethod || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        {item.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {formatEntryDate(item.entryDate)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
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

