import React, { useState, useEffect } from 'react';
import { X, Loader2, FileText, Download, Image as ImageIcon } from 'lucide-react';
import { getReceiptBySpentTableId } from '../services/receiptsDatabase';
import { getReceiptImageUrl, downloadReceiptImage } from '../services/receiptsStorage';
import { downloadReceiptPdf } from '../services/receiptPdfService';
import { Receipt } from '../services/receiptsDatabase';
import { SpentItem } from '../services/spentTableDatabase';

interface ReceiptModalProps {
  spentItem: SpentItem;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ spentItem, onClose }) => {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReceipt = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch receipt record from database
        const receiptData = await getReceiptBySpentTableId(spentItem.id);
        
        if (!receiptData) {
          setError('Receipt not found for this transaction');
          setLoading(false);
          return;
        }

        setReceipt(receiptData);

        // Fetch signed URL for the receipt image
        const imageUrl = await getReceiptImageUrl(receiptData.storagePath);
        setReceiptImageUrl(imageUrl);
      } catch (err) {
        console.error('Error loading receipt:', err);
        setError(err instanceof Error ? err.message : 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };

    loadReceipt();
  }, [spentItem.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `GYD ${amount.toLocaleString()}`;
  };

  const handleDownloadImage = async () => {
    if (!receipt || !receiptImageUrl) return;

    try {
      // Download the image blob
      const blob = await downloadReceiptImage(receipt.storagePath);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename from receipt
      const merchantSlug = (receipt.merchant || 'receipt').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateSlug = new Date(receipt.scannedAt || receipt.createdAt).toISOString().split('T')[0];
      const extension = receipt.storagePath.split('.').pop() || 'jpg';
      link.download = `receipt_${merchantSlug}_${dateSlug}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading image:', err);
      alert('Failed to download receipt image');
    }
  };

  const handleDownloadPdf = async () => {
    if (!receipt) return;

    try {
      await downloadReceiptPdf(receipt, receipt.receiptData, spentItem);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to generate PDF');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between z-10">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Receipt Details</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span className="ml-3 text-slate-600 dark:text-slate-300">Loading receipt...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>
            </div>
          ) : receipt && receiptImageUrl ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Receipt Image */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Original Receipt</h4>
                  <button
                    onClick={handleDownloadImage}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-700"
                    title="Download original receipt image"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Download Image</span>
                  </button>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-700/50">
                  <img
                    src={receiptImageUrl}
                    alt="Original receipt"
                    className="w-full h-auto max-h-[600px] object-contain"
                  />
                </div>
              </div>

              {/* Digitally Recreated Receipt */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Digitized Receipt</h4>
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-700"
                    title="Download digitized receipt as PDF"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6 bg-white dark:bg-slate-800">
                  {receipt.receiptData ? (
                    <>
                      {/* Receipt Header */}
                      <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                          {receipt.receiptData.merchant || receipt.merchant || 'MERCHANT'}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(receipt.receiptData.date || spentItem.transactionDateTime)}
                        </div>
                      </div>

                      {/* Receipt Items - Show all items from the stored receipt data */}
                      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                        {receipt.receiptData.items && receipt.receiptData.items.length > 0 ? (
                          receipt.receiptData.items.map((item, index) => (
                            <div key={index} className="border-b border-slate-200 dark:border-slate-700 pb-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900 dark:text-slate-200">{item.description}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Category: {item.category} • Qty: {item.quantity}
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="font-semibold text-slate-900 dark:text-slate-200">
                                    {formatCurrency(item.total)}
                                  </div>
                                  {item.quantity > 1 && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      {formatCurrency(item.unitPrice)} each
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-slate-500 text-center py-2">
                            No items found in receipt data
                          </div>
                        )}
                      </div>

                      {/* Receipt Footer */}
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 dark:text-slate-300">Subtotal:</span>
                          <span className="font-medium text-slate-900 dark:text-slate-200">
                            {formatCurrency(receipt.receiptData.total || receipt.total || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
                          <span className="text-slate-900 dark:text-slate-100">Total:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(receipt.receiptData.total || receipt.total || 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Fallback to showing single item if receipt data not stored
                    <>
                      {/* Receipt Header */}
                      <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                          {receipt.merchant || 'MERCHANT'}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(spentItem.transactionDateTime)}
                        </div>
                      </div>

                      {/* Receipt Items */}
                      <div className="space-y-3 mb-4">
                        <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-slate-900 dark:text-slate-200">{spentItem.item}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Category: {spentItem.category} • Qty: {spentItem.itemQty}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="font-semibold text-slate-900 dark:text-slate-200">
                                {formatCurrency(spentItem.itemTotal)}
                              </div>
                              {spentItem.itemQty > 1 && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatCurrency(spentItem.itemCost)} each
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Receipt Footer */}
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 dark:text-slate-300">Subtotal:</span>
                          <span className="font-medium text-slate-900 dark:text-slate-200">
                            {formatCurrency(spentItem.itemTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
                          <span className="text-slate-900 dark:text-slate-100">Total:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(spentItem.itemTotal)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Payment Info */}
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                      <div>Payment Method: {spentItem.paymentMethod || 'N/A'}</div>
                      <div>Source: {spentItem.source}</div>
                      {receipt.scannedAt && (
                        <div>Scanned: {formatDate(receipt.scannedAt)}</div>
                      )}
                    </div>
                  </div>

                  {/* Receipt Footer Note */}
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <FileText className="w-4 h-4" />
                      <span>Digitized Receipt - Generated from OCR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

