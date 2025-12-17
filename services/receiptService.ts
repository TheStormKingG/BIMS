import { uploadReceiptImage } from './receiptsStorage';
import { createReceipt } from './receiptsDatabase';
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

    // Create receipt record
    const receipt = await createReceipt({
      spentTableId,
      storagePath,
      merchant: receiptData.merchant,
      total: receiptData.total,
      currency: 'GYD',
      scannedAt: receiptData.date ? new Date(receiptData.date).toISOString() : new Date().toISOString(),
    });

    return receipt.id;
  } catch (err) {
    console.error('Error saving receipt:', err);
    throw err;
  }
};

