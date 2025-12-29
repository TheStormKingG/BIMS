import { getSupabase } from './supabaseClient';

const supabase = getSupabase();
const RECEIPTS_BUCKET = 'receipts';

/**
 * Upload a receipt image to Supabase Storage
 * @param file File or Blob to upload
 * @param userId User ID for folder structure
 * @returns Storage path
 */
export const uploadReceiptImage = async (file: File | Blob, userId: string): Promise<string> => {
  try {
    console.log('Uploading receipt image:', { userId, fileType: file instanceof File ? file.type : 'blob', fileSize: file instanceof File ? file.size : 'unknown' });
    
    // Generate unique filename: userId/timestamp-randomUUID.extension
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const extension = file instanceof File ? (file.name.split('.').pop() || 'jpg') : 'jpg';
    const fileName = `${userId}/${timestamp}-${randomId}.${extension}`;
    
    console.log('Uploading to path:', fileName);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      console.error('Error details:', { message: error.message, statusCode: error.statusCode });
      // If bucket doesn't exist, create it first
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
        throw new Error(`Storage bucket '${RECEIPTS_BUCKET}' not found. Please create it in Supabase Dashboard > Storage.`);
      }
      throw error;
    }
    
    console.log('Successfully uploaded receipt image, path:', data.path);
    return data.path;
  } catch (err) {
    console.error('Error uploading receipt image:', err);
    console.error('Upload error details:', err);
    throw err;
  }
};

/**
 * Get a signed URL for a receipt image (valid for 1 hour)
 * @param storagePath Path in storage bucket
 * @returns Signed URL
 */
export const getReceiptImageUrl = async (storagePath: string): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(storagePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('Storage error details:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error
      });
      
      // Provide helpful error message for RLS policy errors
      if (error.message?.includes('row-level security policy') || error.message?.includes('RLS')) {
        throw new Error('Storage access denied. Please ensure the receipts storage bucket RLS policies are configured correctly. Check migration 023_setup_receipts_storage_bucket.sql');
      }
      
      throw error;
    }
    if (!data?.signedUrl) throw new Error('No signed URL returned');
    
    return data.signedUrl;
  } catch (err) {
    console.error('Error getting receipt image URL:', err);
    throw err;
  }
};

/**
 * Download a receipt image as a blob
 * @param storagePath Path in storage bucket
 * @returns Blob
 */
export const downloadReceiptImage = async (storagePath: string): Promise<Blob> => {
  try {
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .download(storagePath);
    
    if (error) throw error;
    if (!data) throw new Error('No data returned');
    
    return data;
  } catch (err) {
    console.error('Error downloading receipt image:', err);
    throw err;
  }
};

/**
 * Delete a receipt image from storage
 * @param storagePath Path in storage bucket
 */
export const deleteReceiptImage = async (storagePath: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .remove([storagePath]);
    
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting receipt image:', err);
    throw err;
  }
};

