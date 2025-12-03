import React, { useState } from 'react';
import { Transaction } from '../types';
import { Search, Filter, ShoppingBag, Pencil, X, Save } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../constants';

interface TransactionListProps {
  transactions: Transaction[];
  onUpdateTransaction: (transaction: Transaction) => void;
}

interface EditingItemState {
  txId: string;
  itemIndex: number;
  date: string;
  merchant: string;
  description: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onUpdateTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [editingItem, setEditingItem] = useState<EditingItemState | null>(null);

  // Flatten transactions into line items for the "Spent Table" view
  // Add itemIndex to track specific line items for editing
  const allItems = transactions.flatMap(tx => 
    tx.items.map((item, index) => ({
      ...item,
      merchant: tx.merchant,
      date: tx.date,
      txId: tx.id,
      itemIndex: index
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const categories = ['All', ...Array.from(new Set(allItems.map(i => i.category)))];

  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.merchant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEditClick = (item: typeof filteredItems[0]) => {
    setEditingItem({
      txId: item.txId,
      itemIndex: item.itemIndex,
      date: item.date,
      merchant: item.merchant,
      description: item.description,
      category: item.category,
      unitPrice: item.unitPrice,
      quantity: item.quantity
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    const originalTx = transactions.find(t => t.id === editingItem.txId);
    if (!originalTx) return;

    // Create a copy of items
    const newItems = [...originalTx.items];
    
    // Update the specific item
    const newItemTotal = editingItem.unitPrice * editingItem.quantity;
    newItems[editingItem.itemIndex] = {
      description: editingItem.description,
      category: editingItem.category,
      unitPrice: editingItem.unitPrice,
      quantity: editingItem.quantity,
      total: newItemTotal
    };

    // Calculate new total amount for the transaction
    const newTotalAmount = newItems.reduce((sum, item) => sum + item.total, 0);

    // Construct updated transaction
    const updatedTx: Transaction = {
      ...originalTx,
      date: editingItem.date,
      merchant: editingItem.merchant,
      items: newItems,
      totalAmount: newTotalAmount
    };

    onUpdateTransaction(updatedTx);
    setEditingItem(null);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100 sticky top-0 z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search items or merchants..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item / Merchant</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => (
                  <tr key={`${item.txId}-${item.itemIndex}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{item.description}</div>
                      <div className="text-xs text-slate-400">{item.merchant}</div>
                    </td>
                    <td className="px-4 py-3">
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                         {item.category}
                       </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">${item.unitPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">${item.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Item"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <ShoppingBag className="w-8 h-8 opacity-20" />
                       <p>No transactions found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
               <h3 className="font-bold text-slate-800">Edit Entry</h3>
               <button 
                 onClick={() => setEditingItem(null)}
                 className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="p-6 space-y-4">
               {/* Transaction Level Fields (Affects whole receipt) */}
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                    <input 
                      type="date"
                      value={editingItem.date}
                      onChange={e => setEditingItem({...editingItem, date: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Merchant</label>
                    <input 
                      type="text"
                      value={editingItem.merchant}
                      onChange={e => setEditingItem({...editingItem, merchant: e.target.value})}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                    />
                  </div>
               </div>

               {/* Line Item Fields */}
               <div className="pt-4 border-t border-slate-100">
                 <p className="text-xs font-semibold text-emerald-600 mb-3 uppercase">Item Details</p>
                 
                 <div className="space-y-3">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                      <input 
                        type="text"
                        value={editingItem.description}
                        onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                        <select 
                           value={editingItem.category}
                           onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                           className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-black"
                        >
                          {DEFAULT_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          {/* Fallback if current category is not in default list */}
                          {!DEFAULT_CATEGORIES.includes(editingItem.category) && (
                            <option value={editingItem.category}>{editingItem.category}</option>
                          )}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price</label>
                            <input 
                              type="number"
                              value={editingItem.unitPrice}
                              onChange={e => setEditingItem({...editingItem, unitPrice: Number(e.target.value)})}
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                              min="0"
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qty</label>
                            <input 
                              type="number"
                              value={editingItem.quantity}
                              onChange={e => setEditingItem({...editingItem, quantity: Number(e.target.value)})}
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm text-black"
                              min="0"
                            />
                         </div>
                      </div>
                   </div>
                 </div>
               </div>
               
               <div className="pt-4 bg-emerald-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-xs text-emerald-800 font-medium">New Item Total</span>
                  <span className="text-lg font-bold text-emerald-700">
                    ${(editingItem.unitPrice * editingItem.quantity).toLocaleString()}
                  </span>
               </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
               <button 
                 onClick={() => setEditingItem(null)}
                 className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleSaveEdit}
                 className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-emerald-200 flex items-center gap-2 transition-colors"
               >
                 <Save className="w-4 h-4" /> Save Changes
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};