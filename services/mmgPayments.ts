import { getSupabase } from './supabaseClient';
import { SubscriptionPlan } from './subscriptionService';

export interface MMGPaymentRequest {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  amount_expected: number;
  currency: string;
  reference_code: string;
  generated_message: string;
  status: 'generated' | 'user_uploaded' | 'ai_parsed' | 'admin_uploaded' | 'verified' | 'rejected' | 'expired';
  created_at: string;
  user_uploaded_at: string | null;
  admin_uploaded_at: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  expires_at: string;
  last_error: string | null;
}

export interface CreatePaymentRequestResponse {
  request_id: string;
  generated_message: string;
  reference_code: string;
  amount_expected: number;
  payee_phone: string;
  expires_at: string;
}

export interface PaymentExtraction {
  extracted_amount: number | null;
  extracted_transaction_id: string | null;
  extracted_reference_code: string | null;
  extracted_datetime: string | null;
  extracted_sender: string | null;
  extracted_receiver: string | null;
}

// Plan prices in GYD
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  none: 0,
  personal: 1881, // $9 USD * 209 GYD/USD
  pro: 3762, // $18 USD * 209 GYD/USD
  pro_max: 9405, // $45 USD * 209 GYD/USD
};

export const MMG_PAYEE_PHONE = '6335874';

/**
 * Create a new MMG payment request
 */
export async function createPaymentRequest(
  plan: SubscriptionPlan
): Promise<CreatePaymentRequestResponse> {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Call edge function to create payment request
  const { data, error } = await supabase.functions.invoke('mmg-create-request', {
    body: { plan },
  });

  if (error) {
    console.error('Error creating payment request:', error);
    throw new Error(error.message || 'Failed to create payment request');
  }

  if (!data || data.error) {
    throw new Error(data?.error || 'Failed to create payment request');
  }

  return data;
}

/**
 * Upload payment screenshot and trigger AI parsing
 */
export async function uploadPaymentScreenshot(
  requestId: string,
  file: File
): Promise<PaymentExtraction> {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated');
  }

  // Upload file to storage
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop() || 'png';
  const storagePath = `${requestId}/user_success/${timestamp}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('mmg_payments')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    throw new Error(uploadError.message || 'Failed to upload screenshot');
  }

  // Call edge function to parse the image
  const { data: parseData, error: parseError } = await supabase.functions.invoke('mmg-parse-user-success', {
    body: {
      request_id: requestId,
      storage_path: storagePath,
    },
  });

  if (parseError) {
    console.error('Error parsing payment screenshot:', parseError);
    throw new Error(parseError.message || 'Failed to parse screenshot');
  }

  if (!parseData || parseData.error) {
    throw new Error(parseData?.error || 'Failed to parse screenshot');
  }

  return parseData.extraction || {};
}

/**
 * Get payment request by ID
 */
export async function getPaymentRequest(requestId: string): Promise<MMGPaymentRequest | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('mmg_payment_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching payment request:', error);
    return null;
  }

  return data;
}

/**
 * Get all payment requests for current user
 */
export async function getUserPaymentRequests(): Promise<MMGPaymentRequest[]> {
  const supabase = getSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('mmg_payment_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payment requests:', error);
    return [];
  }

  return data || [];
}

/**
 * Get payment request status
 */
export async function getPaymentRequestStatus(requestId: string): Promise<string | null> {
  const request = await getPaymentRequest(requestId);
  return request?.status || null;
}

