import React, { useState } from 'react';
import { SpentItem } from '../services/spentTableDatabase';
import { ShoppingBag, Plus, X, Edit2 } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../constants';
import { CashWallet, BankAccount } from '../types';

interface SpendingProps {
  spentItems: SpentItem[];
  loading?: boolean;
  banks?: BankAccount[];
  wallet?: CashWallet | null;
  walletBalance?: number;
  onAddSpend?: (item: Omit<SpentItem, 'id' | 'entryDate'>) => Promise<void>;
  onUpdateSpend?: (id: string, updates: Partial<SpentItem>) => Promise<void>;
}

export const Spending: React.FC<SpendingProps> = ({ spentItems, loading = false, banks = [], wallet = null, walletBalance = 0, onAddSpend, onUpdateSpend }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SpentItem | null>(null);
  const [formData, setFormData] = useState({
    transactionDateTime: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm format
    category: 'Other',
    item: '',
    itemCost: '',
    itemQty: '1',
    itemTotal: '',
    paymentMethod: '',
    source: 'MANUAL' as const,
  });

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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total when cost or qty changes
      if (field === 'itemCost' || field === 'itemQty') {
        const cost = field === 'itemCost' ? Number(value) : Number(prev.itemCost);
        const qty = field === 'itemQty' ? Number(value) : Number(prev.itemQty);
        updated.itemTotal = (cost * qty).toString();
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddSpend) return;

    try {
      await onAddSpend({
        transactionDateTime: new Date(formData.transactionDateTime).toISOString(),
        category: formData.category,
        item: formData.item,
        itemCost: Number(formData.itemCost),
        itemQty: Number(formData.itemQty),
        itemTotal: Number(formData.itemTotal),
        paymentMethod: formData.paymentMethod || null,
        source: formData.source,
      });
      
      // Reset form and close modal
      setFormData({
        transactionDateTime: new Date().toISOString().slice(0, 16),
        category: 'Other',
        item: '',
        itemCost: '',
        itemQty: '1',
        itemTotal: '',
        paymentMethod: '',
        source: 'MANUAL',
      });
      setShowAddModal(false);
    } catch (err) {
      // Error handling is done in parent
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setFormData({
      transactionDateTime: new Date().toISOString().slice(0, 16),
      category: 'Other',
      item: '',
      itemCost: '',
      itemQty: '1',
      itemTotal: '',
      paymentMethod: '',
      source: 'MANUAL',
    });
  };

  const handleEditClick = (item: SpentItem) => {
    setEditingItem(item);
    // Convert ISO datetime to local datetime format for input
    const date = new Date(item.transactionDateTime);
    const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    
    setFormData({
      transactionDateTime: localDateTime,
      category: item.category,
      item: item.item,
      itemCost: item.itemCost.toString(),
      itemQty: item.itemQty.toString(),
      itemTotal: item.itemTotal.toString(),
      paymentMethod: item.paymentMethod || '',
      source: item.source as 'MANUAL' | 'SCAN_RECEIPT' | 'IMPORT_EMAIL' | 'IMPORT_SMS',
    });
    setShowAddModal(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateSpend || !editingItem) return;

    try {
      await onUpdateSpend(editingItem.id, {
        transactionDateTime: new Date(formData.transactionDateTime).toISOString(),
        category: formData.category,
        item: formData.item,
        itemCost: Number(formData.itemCost),
        itemQty: Number(formData.itemQty),
        itemTotal: Number(formData.itemTotal),
        paymentMethod: formData.paymentMethod || null,
        source: formData.source,
      });
      
      handleCloseModal();
    } catch (err) {
      // Error handling is done in parent
    }
  };

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
        {onAddSpend && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Spend
          </button>
        )}
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
                <th className="px-4 py-3 text-center">Action</th>
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
                    <td className="px-4 py-3">
                      {onUpdateSpend && (
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
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

      {/* Add/Edit Spend Modal */}
      {showAddModal && (onAddSpend || onUpdateSpend) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingItem ? 'Edit Spending' : 'Add Spending'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={editingItem ? handleUpdateSubmit : handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Transaction Date/Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.transactionDateTime}
                    onChange={(e) => handleInputChange('transactionDateTime', e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                    required
                  >
                    {DEFAULT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Item <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.item}
                  onChange={(e) => handleInputChange('item', e.target.value)}
                  placeholder="Item description"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Item Cost (GYD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.itemCost}
                    onChange={(e) => handleInputChange('itemCost', e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={formData.itemQty}
                    onChange={(e) => handleInputChange('itemQty', e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Item Total (GYD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.itemTotal}
                    onChange={(e) => handleInputChange('itemTotal', e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 text-black font-semibold"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-black"
                >
                  <option value="">Select payment method...</option>
                  {(wallet || walletBalance > 0) && (
                    <option value="Cash Wallet">Cash Wallet</option>
                  )}
                  {banks.length > 0 && (
                    <>
                      {banks.map(bank => (
                        <option key={bank.id} value={bank.name}>
                          {bank.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                >
                  {editingItem ? 'Update Spending' : 'Add Spending'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

