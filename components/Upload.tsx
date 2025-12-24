import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseReceiptImage } from '../services/geminiService';
import { ReceiptScanResult, Account } from '../types';
import { Upload as UploadIcon, Loader2, Check, AlertCircle, X, FileImage } from 'lucide-react';
import { emitEvent } from '../services/eventService';
import { useSubscription } from '../hooks/useSubscription';
import { canUse } from '../services/subscriptionService';
import { PaywallModal } from './PaywallModal';

interface UploadProps {
  accounts: Account[];
  onSave: (transactionData: ReceiptScanResult, accountId: string, file?: File) => void;
}

export const Upload: React.FC<UploadProps> = ({ accounts, onSave }) => {
  const navigate = useNavigate();
  const { entitlement } = useSubscription();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null); // Store the original file for receipt storage
  const [showPaywall, setShowPaywall] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const canScanReceipts = canUse('receipt_scan', entitlement);

  // Calculate available balance for each account
  const accountsWithBalance = useMemo(() => {
    return accounts.map(acc => {
      const available = acc.type === 'CASH_WALLET' 
        ? ((acc as any).denominations && Object.entries((acc as any).denominations).reduce((s:number, [d, c]: any) => s + (Number(d) * c), 0)) || acc.balance || 0
        : acc.balance || 0;
      return { ...acc, available };
    });
  }, [accounts]);

  // Filter accounts with sufficient funds based on receipt total
  const accountsWithFunds = useMemo(() => {
    if (!scanResult) return accountsWithBalance;
    return accountsWithBalance.filter(acc => acc.available >= scanResult.total);
  }, [accountsWithBalance, scanResult]);

  // Emit VIEW_UPLOAD event when component mounts (user views upload page)
  useEffect(() => {
    emitEvent('VIEW_UPLOAD').catch(err => {
      console.error('Error emitting VIEW_UPLOAD event:', err);
    });
  }, []); // Run once on mount

  // Auto-select first account with sufficient funds when scan result changes
  useEffect(() => {
    if (scanResult && accountsWithFunds.length > 0) {
      const currentAccount = accountsWithFunds.find(acc => acc.id === selectedAccountId);
      if (!currentAccount) {
        setSelectedAccountId(accountsWithFunds[0].id);
      }
    } else if (scanResult && accountsWithFunds.length === 0) {
      setSelectedAccountId('');
    }
  }, [scanResult, accountsWithFunds, selectedAccountId]);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileProcess = async (file: File) => {
    // Check subscription before scanning
    if (!canScanReceipts) {
      setShowPaywall(true);
      return;
    }

    // Store the file for later receipt storage
    setReceiptFile(file);

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const base64 = await convertToBase64(file);
      const base64Data = base64.split(',')[1];
      
      const result = await parseReceiptImage(base64Data);
      setScanResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setReceiptFile(null); // Clear file on error
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileProcess(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await handleFileProcess(file);
    } else {
      setError('Please drop an image file');
    }
  };

  const handleSave = () => {
    console.log('Upload handleSave called:', { 
      hasScanResult: !!scanResult, 
      selectedAccountId, 
      hasFile: !!receiptFile 
    });
    
    if (scanResult && selectedAccountId) {
      console.log('Calling onSave with:', { 
        scanResult, 
        accountId: selectedAccountId, 
        file: receiptFile 
      });
      // Pass the file along with scan result for receipt storage
      onSave(scanResult, selectedAccountId, receiptFile || undefined);
      // Reset
      setScanResult(null);
      setPreviewUrl(null);
      setReceiptFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      console.warn('Cannot save - missing data:', { 
        hasScanResult: !!scanResult, 
        selectedAccountId 
      });
    }
  };

  const handleCancel = () => {
    setScanResult(null);
    setPreviewUrl(null);
    setReceiptFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    navigate('/overview');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {!scanResult && !isScanning && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Upload Receipt</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">Upload a receipt image to extract transaction details automatically</p>
          
          {/* Drag and Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <UploadIcon className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {isDragging ? 'Drop your receipt here' : 'Drag and drop your receipt here'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">or</p>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              <FileImage className="w-5 h-5" />
              Browse Files
            </button>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">Supports JPG, PNG, and other image formats</p>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-12">
          <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
            <p className="text-lg font-semibold dark:text-slate-200">Analyzing receipt with AI...</p>
            <p className="text-sm mt-2 dark:text-slate-300">This may take a few moments</p>
          </div>
        </div>
      )}

      {error && !isScanning && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-6 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-6 h-6 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Upload Failed</h4>
            <p className="text-sm">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-sm font-bold uppercase mt-3 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {scanResult && !isScanning && (
        <>
          {(!scanResult.total || scanResult.total === 0 || !scanResult.items || scanResult.items.length === 0) ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="relative h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                {previewUrl && (
                  <img src={previewUrl} alt="Receipt Preview" className="w-full h-full object-cover opacity-50" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-amber-100/90 dark:bg-amber-900/60 backdrop-blur px-4 py-2 rounded-full shadow-sm text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> No Data Found
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Oops—this receipt played<br />hide-and-seek.
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    I found zero data—more like art or random paper. Maybe it's not even a receipt.
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-left border border-amber-200 dark:border-amber-800 mb-6">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-2">Try again, but before ensure:</p>
                  <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
                    <li>Merchant name visible</li>
                    <li>Totals readable</li>
                    <li>Flat surface</li>
                    <li>Good lighting</li>
                  </ul>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setScanResult(null);
                      setPreviewUrl(null);
                      setReceiptFile(null);
                      setError(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      // Re-open file picker
                      fileInputRef.current?.click();
                    }}
                    className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 active:scale-95 shadow-lg hover:shadow-xl active:shadow-md text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 px-8 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="relative h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                {previewUrl && (
                  <img src={previewUrl} alt="Receipt Preview" className="w-full h-full object-cover opacity-50" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-sm text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Scan Successful
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Merchant</label>
                    <input
                      type="text"
                      value={scanResult.merchant || ''}
                      readOnly
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
                    <input
                      type="date"
                      value={scanResult.date || ''}
                      readOnly
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Total</label>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${scanResult.total.toLocaleString()} GYD
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Items</label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-slate-600 dark:text-slate-300 font-medium">Item</th>
                          <th className="px-4 py-2 text-right text-slate-600 dark:text-slate-300 font-medium">Qty</th>
                          <th className="px-4 py-2 text-right text-slate-600 dark:text-slate-300 font-medium">Price</th>
                          <th className="px-4 py-2 text-right text-slate-600 dark:text-slate-300 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {scanResult.items.map((item, idx) => (
                          <tr key={idx} className="dark:bg-slate-800">
                            <td className="px-4 py-2 dark:text-slate-200">{item.description}</td>
                            <td className="px-4 py-2 text-right dark:text-slate-200">{item.quantity}</td>
                            <td className="px-4 py-2 text-right dark:text-slate-200">${item.unitPrice.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right font-medium dark:text-slate-200">${item.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Payment Method <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-slate-700 text-black dark:text-slate-100"
                    required
                  >
                    <option value="">Select payment method</option>
                    {accountsWithFunds.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} - ${acc.available.toLocaleString()} GYD available
                      </option>
                    ))}
                    {accountsWithFunds.length === 0 && scanResult && (
                      <option disabled>No accounts with sufficient funds</option>
                    )}
                  </select>
                  {accountsWithFunds.length === 0 && scanResult && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      No accounts have sufficient funds for this transaction (${scanResult.total.toLocaleString()} GYD required)
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSave}
                    disabled={!selectedAccountId}
                    className="flex-1 bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                  >
                    Save Transaction
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        requiredPlan="pro"
        featureName="AI Receipt Scanning"
      />
    </div>
  );
};

