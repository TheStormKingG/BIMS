import React, { useState, useRef, useEffect, useMemo } from 'react';
import { parseReceiptImage } from '../services/geminiService';
import { ReceiptScanResult, Account, LineItem } from '../types';
import { Camera, Upload, Loader2, Check, AlertCircle, X } from 'lucide-react';

interface ScannerProps {
  accounts: Account[];
  onSave: (transactionData: ReceiptScanResult, accountId: string) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ accounts, onSave }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const base64 = await convertToBase64(file);
      // Strip prefix if present (e.g., "data:image/jpeg;base64,") for API usage if needed, 
      // but usually SDK handles or needs clean base64. 
      // The Gemini 2.5 SDK expects raw base64 data usually if passing inlineData.
      const base64Data = base64.split(',')[1]; 
      
      const result = await parseReceiptImage(base64Data);
      setScanResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsScanning(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSave = () => {
    if (scanResult && selectedAccountId) {
      onSave(scanResult, selectedAccountId);
      // Reset
      setScanResult(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    setScanResult(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl text-center">
        <h2 className="text-2xl font-bold mb-2">Scan Receipt</h2>
        <p className="text-slate-400 mb-6">Take a photo or upload a screenshot (Email/SMS)</p>
        
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        <div className="flex justify-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-full font-semibold transition-transform active:scale-95"
          >
            <Camera className="w-5 h-5" />
            Snap Photo
          </button>
          <button
             onClick={() => fileInputRef.current?.click()}
             className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-full font-semibold transition-colors"
          >
            <Upload className="w-5 h-5" />
            Upload File
          </button>
        </div>
      </div>

      {isScanning && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
          <p>Analyzing receipt with AI...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold">Scan Failed</h4>
            <p className="text-sm">{error}</p>
            <button 
              onClick={handleCancel}
              className="text-xs font-bold uppercase mt-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {scanResult && !isScanning && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
           <div className="relative h-32 bg-slate-100 overflow-hidden">
             {previewUrl && (
                <img src={previewUrl} alt="Receipt Preview" className="w-full h-full object-cover opacity-50" />
             )}
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm text-sm font-semibold text-emerald-700 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Scan Successful
                 </div>
             </div>
           </div>

           <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase">Merchant</label>
                  <input 
                    type="text" 
                    value={scanResult.merchant} 
                    onChange={(e) => setScanResult({...scanResult, merchant: e.target.value})}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg font-semibold text-black bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase">Date</label>
                  <input 
                    type="date" 
                    value={scanResult.date} 
                    onChange={(e) => setScanResult({...scanResult, date: e.target.value})}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg font-semibold text-black bg-white" 
                  />
                </div>
              </div>

              <div className="mb-6">
                 <label className="block text-xs font-medium text-slate-500 uppercase mb-2">Items Detected</label>
                 <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-600 font-medium">
                        <tr>
                          <th className="p-2">Item</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {scanResult.items.map((item, idx) => (
                           <tr key={idx}>
                             <td className="p-2">
                               <div className="font-medium text-slate-800">{item.description}</div>
                               <div className="text-xs text-emerald-600 bg-emerald-50 inline-block px-1.5 py-0.5 rounded">{item.category}</div>
                             </td>
                             <td className="p-2 text-right text-black">{item.quantity}</td>
                             <td className="p-2 text-right text-black">${item.total.toLocaleString()}</td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <select 
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-white text-black"
                  >
                    {accountsWithFunds.length > 0 ? (
                      accountsWithFunds.map(acc => (
                        <option key={acc.id} value={acc.id} className="text-black">
                          {acc.type === 'CASH_WALLET' ? 'Physical Wallet' : acc.name} 
                          {' '}(Available: ${acc.available.toLocaleString()})
                        </option>
                      ))
                    ) : (
                      <option value="" disabled className="text-black">
                        No payment methods with sufficient funds
                      </option>
                    )}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                   <div className="text-right">
                      <span className="block text-xs text-slate-500">Total Amount</span>
                      <span className="text-2xl font-bold text-slate-900">${scanResult.total.toLocaleString()}</span>
                   </div>
                   <div className="flex gap-3">
                      <button 
                        onClick={handleCancel}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Discard
                      </button>
                      <button 
                        onClick={handleSave}
                        disabled={accountsWithFunds.length === 0 || !selectedAccountId}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold shadow-md shadow-emerald-200 transition-colors"
                      >
                        Confirm & Save
                      </button>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};