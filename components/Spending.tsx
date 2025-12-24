import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SpentItem } from '../services/spentTableDatabase';
import { ShoppingBag, Plus, X, Edit2, ChevronLeft, ChevronRight, Search, Trash2, Download, ChevronDown } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../constants';
import { CashWallet, BankAccount } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { exportSpendingToCSV, exportSpendingToExcel, exportSpendingToPdf } from '../services/exportsService';
import { getSupabase } from '../services/supabaseClient';
import { emitEvent } from '../services/eventService';
import { useSubscription } from '../hooks/useSubscription';
import { canUse } from '../services/subscriptionService';
import { PaywallModal } from './PaywallModal';

interface SpendingProps {
  spentItems: SpentItem[];
  loading?: boolean;
  banks?: BankAccount[];
  wallet?: CashWallet | null;
  walletBalance?: number;
  onAddSpend?: (item: Omit<SpentItem, 'id' | 'entryDate'>) => Promise<void>;
  onUpdateSpend?: (id: string, updates: Partial<SpentItem>) => Promise<void>;
  onDeleteSpend?: (id: string) => Promise<void>;
}

export const Spending: React.FC<SpendingProps> = ({ spentItems, loading = false, banks = [], wallet = null, walletBalance = 0, onAddSpend, onUpdateSpend, onDeleteSpend }) => {
  const { entitlement } = useSubscription();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SpentItem | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceiptItem, setSelectedReceiptItem] = useState<SpentItem | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string>('');
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const searchEventEmittedRef = useRef(false); // Track if we've emitted search event for this search
  
  const canExportCSV = canUse('export_csv', entitlement);
  const canExportExcel = canUse('export_excel', entitlement);
  const canEditTransactions = canUse('transaction_editing', entitlement);
  const canDeleteTransactions = canUse('transaction_deletion', entitlement);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const handleExportCSV = () => {
    if (!canExportCSV) {
      setPaywallFeature('CSV Export');
      setShowPaywall(true);
      setShowExportDropdown(false);
      return;
    }
    exportSpendingToCSV(filteredItems);
    emitEvent('EXPORT_CSV', { itemCount: filteredItems.length }).catch(err => {
      console.error('Error emitting EXPORT_CSV event:', err);
    });
    setShowExportDropdown(false);
  };

  const handleExportExcel = async () => {
    if (!canExportExcel) {
      setPaywallFeature('Excel Export');
      setShowPaywall(true);
      setShowExportDropdown(false);
      return;
    }
    try {
      await exportSpendingToExcel(filteredItems);
      emitEvent('EXPORT_EXCEL', { itemCount: filteredItems.length }).catch(err => {
        console.error('Error emitting EXPORT_EXCEL event:', err);
      });
    } catch (err) {
      alert('Failed to export to Excel: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setShowExportDropdown(false);
  };

  const handleExportPDF = async () => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || undefined;
      const userAvatarUrl = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || null;
      await exportSpendingToPdf(filteredItems, currentMonthName, userEmail, userAvatarUrl);
      emitEvent('EXPORT_PDF', { itemCount: filteredItems.length, month: currentMonthName }).catch(err => {
        console.error('Error emitting EXPORT_PDF event:', err);
      });
    } catch (err) {
      alert('Failed to export to PDF: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setShowExportDropdown(false);
  };

  const currentMonthName = selectedMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  // Filter items by selected month and search term
  const filteredItems = useMemo(() => {
    const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return spentItems.filter(item => {
      const itemDate = new Date(item.transactionDateTime);
      const isInMonth = itemDate >= monthStart && itemDate <= monthEnd;
      
      if (!isInMonth) return false;
      
      if (searchTerm.trim() === '') return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        item.item.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        (item.paymentMethod && item.paymentMethod.toLowerCase().includes(searchLower)) ||
        item.source.toLowerCase().includes(searchLower)
      );
    });
  }, [spentItems, selectedMonth, searchTerm]);

  const handlePreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setSelectedMonth(new Date());
  };

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
    if (!canEditTransactions) {
      setPaywallFeature('Transaction Editing');
      setShowPaywall(true);
      return;
    }
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
      const originalCategory = editingItem.category;
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
      
      // Emit event for goal tracking - transaction categorized (only if category changed)
      if (originalCategory !== formData.category) {
        emitEvent('TRANSACTION_CATEGORIZED', { category: formData.category, originalCategory }).catch(err => {
          console.error('Error emitting TRANSACTION_CATEGORIZED event:', err);
        });
      }
      
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
          <p className="text-slate-600 dark:text-slate-300">Loading spending data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, categories..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              // Emit event for goal tracking - spending searched (only once per search session)
              if (e.target.value.trim() !== '' && !searchEventEmittedRef.current) {
                searchEventEmittedRef.current = true;
                emitEvent('SPENDING_SEARCHED', { searchTerm: e.target.value }).catch(err => {
                  console.error('Error emitting SPENDING_SEARCHED event:', err);
                });
              } else if (e.target.value.trim() === '') {
                // Reset flag when search is cleared
                searchEventEmittedRef.current = false;
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-slate-700 text-black dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400"
          />
        </div>
      </div>

      {/* Month/Year Filter and Add Spend Button */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousMonth}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
            title="Go to current month"
          >
            {currentMonthName}
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Next month"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown Button */}
          {filteredItems.length > 0 && (
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="text-emerald-600 dark:text-emerald-400 border border-emerald-600 dark:border-emerald-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-2"
                title="Export spending data"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                  {canExportCSV ? (
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPaywallFeature('CSV Export');
                        setShowPaywall(true);
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                      title="Requires Pro plan"
                    >
                      <Download className="w-4 h-4" />
                      CSV <span className="text-xs ml-auto">🔒</span>
                    </button>
                  )}
                  {canExportExcel ? (
                    <button
                      onClick={handleExportExcel}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      XLS
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPaywallFeature('Excel Export');
                        setShowPaywall(true);
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                      title="Requires Pro plan"
                    >
                      <Download className="w-4 h-4" />
                      XLS <span className="text-xs ml-auto">🔒</span>
                    </button>
                  )}
                  <button
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              )}
            </div>
          )}
          {onAddSpend && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span>+Add Spend</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase font-medium text-xs border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Entered</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDateTime(item.transactionDateTime)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{item.item}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      ${item.itemTotal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                      {item.itemQty}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200 font-medium">
                      ${item.itemCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-600 text-slate-800 dark:text-slate-200">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {item.paymentMethod || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      {item.source === 'SCAN_RECEIPT' ? (
                        <button
                          onClick={() => setSelectedReceiptItem(item)}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 cursor-pointer transition-colors"
                          title="View receipt"
                        >
                          {item.source}
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                          {item.source}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {formatEntryDate(item.entryDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {onUpdateSpend && (
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            title="Edit item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onDeleteSpend && (
                          <button
                            onClick={async () => {
                              if (!canDeleteTransactions) {
                                setPaywallFeature('Transaction Deletion');
                                setShowPaywall(true);
                                return;
                              }
                              if (window.confirm('Are you sure you want to delete this spending item?')) {
                                try {
                                  await onDeleteSpend(item.id);
                                } catch (err) {
                                  alert('Failed to delete item: ' + (err instanceof Error ? err.message : 'Unknown error'));
                                }
                              }
                            }}
                            disabled={!canDeleteTransactions}
                            className={`p-2 rounded-lg transition-colors ${
                              canDeleteTransactions
                                ? 'text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                            }`}
                            title={canDeleteTransactions ? 'Delete item' : 'Transaction deletion requires Pro plan'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingBag className="w-8 h-8 opacity-20" />
                      <p>
                        {searchTerm.trim() !== '' 
                          ? `No spending transactions found matching "${searchTerm}" in ${currentMonthName}`
                          : `No spending transactions for ${currentMonthName}`
                        }
                      </p>
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {editingItem ? 'Edit Spending' : 'Add Spending'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={editingItem ? handleUpdateSubmit : handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Transaction Date/Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.transactionDateTime}
                    onChange={(e) => handleInputChange('transactionDateTime', e.target.value)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-black dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-black dark:text-slate-100"
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Item Cost (GYD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.itemCost}
                    onChange={(e) => handleInputChange('itemCost', e.target.value)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-black dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={formData.itemQty}
                    onChange={(e) => handleInputChange('itemQty', e.target.value)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-slate-700 text-black dark:text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Item Total (GYD)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.itemTotal}
                    onChange={(e) => handleInputChange('itemTotal', e.target.value)}
                    className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-600 text-black dark:text-slate-100 font-semibold"
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
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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

      {/* Receipt Modal */}
      {selectedReceiptItem && (
        <ReceiptModal
          spentItem={selectedReceiptItem}
          onClose={() => setSelectedReceiptItem(null)}
        />
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        requiredPlan="pro"
        featureName={paywallFeature || 'This feature'}
      />
    </div>
  );
};

