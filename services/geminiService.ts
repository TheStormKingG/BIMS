import { ReceiptScanResult } from "../types";
import { getSupabase } from "./supabaseClient";

/**
 * Parse receipt image using Gemini AI via Supabase Edge Function
 * The API key is securely stored server-side and never exposed to the client
 */
export const parseReceiptImage = async (base64Image: string): Promise<ReceiptScanResult> => {
  try {
    const supabase = getSupabase();
    
    // Get the current session to obtain the auth token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Not authenticated. Please log in to scan receipts.');
    }

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('gemini-scan-receipt', {
      body: { base64Image },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to scan receipt');
    }

    if (!data || data.error) {
      throw new Error(data?.error || 'Failed to scan receipt');
    }

    // Validate response structure
    const result = data as ReceiptScanResult;
    if (!result.date) result.date = new Date().toISOString().split('T')[0];
    if (!result.items) result.items = [];
    
    return result;

  } catch (error) {
    console.error("Receipt Scan Error:", error);
    throw error instanceof Error ? error : new Error("Failed to scan receipt. Please try again.");
  }
};
