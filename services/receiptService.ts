import { uploadReceiptImage } from './receiptsStorage';
import { createReceipt, getReceiptBySpentTableId } from './receiptsDatabase';
import { ReceiptScanResult } from '../types';

/**
 * Save a receipt: upload image to storage and create receipt record
 * This should be called after spent_table entries are created
 */
export const saveReceipt = async (
  file: File | Blob,
  spentTableId: string,
  receiptData: ReceiptScanResult
): Promise<string> => {
  try {
    // Get user ID
    const { getSupabase } = await import('./supabaseClient');
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upload image to storage
    const storagePath = await uploadReceiptImage(file, user.id);

    // Use upsert to handle re-scans (update existing receipt instead of creating duplicate)
    // First check if receipt already exists for this spent_table_id
    const existingReceipt = await getReceiptBySpentTableId(spentTableId);
    
    if (existingReceipt) {
      // Update existing receipt with new data
      const { getSupabase } = await import('./supabaseClient');
      const supabase = getSupabase();
      
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          storage_path: storagePath,
          merchant: receiptData.merchant || null,
          total: receiptData.total || null,
          scanned_at: receiptData.date ? new Date(receiptData.date).toISOString() : new Date().toISOString(),
        })
        .eq('id', existingReceipt.id);
      
      if (updateError) throw updateError;
      return existingReceipt.id;
    } else {
      // Create new receipt record
      const receipt = await createReceipt({
        spentTableId,
        storagePath,
        merchant: receiptData.merchant,
        total: receiptData.total,
        currency: 'GYD',
        scannedAt: receiptData.date ? new Date(receiptData.date).toISOString() : new Date().toISOString(),
      });

      return receipt.id;
    }
  } catch (err) {
    console.error('Error saving receipt:', err);
    throw err;
  }
};

