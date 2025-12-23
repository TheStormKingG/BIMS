import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAILS = [
  'stefan.gravesande@preqal.com',
  'stefan.gravesande@gmail.com',
];

function isAdmin(email: string | undefined): boolean {
  return email ? ADMIN_EMAILS.includes(email.toLowerCase()) : false;
}

interface ExtractionResult {
  extracted_amount: number | null;
  extracted_transaction_id: string | null;
  extracted_reference_code: string | null;
  extracted_datetime: string | null;
  extracted_sender: string | null;
  extracted_receiver: string | null;
}

async function extractPaymentInfo(imageBase64: string): Promise<ExtractionResult> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `
Analyze this MMG (Mobile Money Guyana) funds received notification screenshot.

Extract the following information from the image:
- transaction_id: The transaction ID or reference number
- amount: The received amount (as a number, in GYD if mentioned)
- datetime: The transaction date and time (in ISO 8601 format if possible)
- reference_code: A 24-character alphanumeric code that appears in the message (look for "REF:" followed by code)
- sender: The sender's name or phone number
- receiver: The receiver's name or phone number (should be 6335874)

Return ONLY a JSON object with these exact keys:
{
  "extracted_amount": number or null,
  "extracted_transaction_id": string or null,
  "extracted_reference_code": string or null (exactly 24 characters if found),
  "extracted_datetime": string (ISO 8601) or null,
  "extracted_sender": string or null,
  "extracted_receiver": string or null
}

If any field cannot be found, use null. Be precise with the reference_code - it should be exactly 24 uppercase alphanumeric characters.
`;

  try {
    const result = await model.generateContent([prompt, {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/png',
      },
    }]);

    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const extracted = JSON.parse(jsonMatch[0]) as ExtractionResult;
    
    if (extracted.extracted_reference_code) {
      const cleaned = extracted.extracted_reference_code.replace(/[^A-Z0-9]/g, '').toUpperCase();
      if (cleaned.length === 24) {
        extracted.extracted_reference_code = cleaned;
      } else {
        extracted.extracted_reference_code = null;
      }
    }

    return extracted;
  } catch (error) {
    console.error('Error extracting payment info:', error);
    throw error;
  }
}

function verifyPayment(
  request: any,
  userExtraction: ExtractionResult,
  adminExtraction: ExtractionResult
): { verified: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check reference code match
  if (request.reference_code) {
    const userRef = userExtraction.extracted_reference_code;
    const adminRef = adminExtraction.extracted_reference_code;
    
    if (!userRef || userRef !== request.reference_code) {
      errors.push(`User reference code mismatch: expected ${request.reference_code}, got ${userRef}`);
    }
    if (!adminRef || adminRef !== request.reference_code) {
      errors.push(`Admin reference code mismatch: expected ${request.reference_code}, got ${adminRef}`);
    }
  }

  // Check amount match (allow small rounding differences)
  const expectedAmount = parseFloat(request.amount_expected);
  const userAmount = userExtraction.extracted_amount ? parseFloat(userExtraction.extracted_amount.toString()) : null;
  const adminAmount = adminExtraction.extracted_amount ? parseFloat(adminExtraction.extracted_amount.toString()) : null;
  
  if (!userAmount || Math.abs(userAmount - expectedAmount) > 1) {
    errors.push(`User amount mismatch: expected ${expectedAmount}, got ${userAmount}`);
  }
  if (!adminAmount || Math.abs(adminAmount - expectedAmount) > 1) {
    errors.push(`Admin amount mismatch: expected ${expectedAmount}, got ${adminAmount}`);
  }

  // Check transaction ID match (if both have it)
  if (userExtraction.extracted_transaction_id && adminExtraction.extracted_transaction_id) {
    if (userExtraction.extracted_transaction_id !== adminExtraction.extracted_transaction_id) {
      errors.push('Transaction ID mismatch between user and admin screenshots');
    }
  }

  // Check date/time within 48 hours of request creation
  if (userExtraction.extracted_datetime) {
    const extractedDate = new Date(userExtraction.extracted_datetime);
    const requestDate = new Date(request.created_at);
    const diffHours = Math.abs(extractedDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours > 48) {
      errors.push(`Transaction date/time is more than 48 hours from request creation (${diffHours.toFixed(1)} hours)`);
    }
  }

  // Check if request is expired
  const expiresAt = new Date(request.expires_at);
  if (new Date() > expiresAt) {
    errors.push('Payment request has expired');
  }

  // Check if already verified/rejected
  if (request.status === 'verified') {
    errors.push('Payment request has already been verified');
  }
  if (request.status === 'rejected') {
    errors.push('Payment request has already been rejected');
  }

  // Verify reference_secret exists (server-side validation)
  if (!request.reference_secret || request.reference_secret.length < 32) {
    errors.push('Invalid reference secret (server-side validation failed)');
  }

  return {
    verified: errors.length === 0,
    errors,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase.auth.admin.getUserById(user.id);
    const userEmail = userData?.user?.email;
    
    if (!isAdmin(userEmail)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { request_id, storage_path } = await req.json();
    
    if (!request_id || !storage_path) {
      return new Response(
        JSON.stringify({ error: 'Missing request_id or storage_path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment request
    const { data: request, error: requestError } = await supabase
      .from('mmg_payment_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Payment request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user extraction for comparison
    const { data: userExtractions } = await supabase
      .from('mmg_payment_extractions')
      .select('*')
      .eq('request_id', request_id)
      .eq('kind', 'user_success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const userExtraction: ExtractionResult = userExtractions?.raw_json || {
      extracted_amount: null,
      extracted_transaction_id: null,
      extracted_reference_code: null,
      extracted_datetime: null,
      extracted_sender: null,
      extracted_receiver: null,
    };

    // Download admin image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('mmg_payments')
      .download(storage_path);

    if (downloadError || !imageData) {
      return new Response(
        JSON.stringify({ error: 'Failed to download image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));

    // Extract payment info using AI
    let adminExtraction: ExtractionResult;
    try {
      adminExtraction = await extractPaymentInfo(base64);
    } catch (error) {
      console.error('AI extraction error:', error);
      
      await supabase
        .from('mmg_payment_requests')
        .update({
          status: 'admin_uploaded',
          last_error: `AI extraction failed: ${error.message}`,
        })
        .eq('id', request_id);

      return new Response(
        JSON.stringify({ error: 'Failed to extract payment information', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store admin extraction
    await supabase.from('mmg_payment_extractions').insert({
      request_id,
      kind: 'admin_received',
      extracted_amount: adminExtraction.extracted_amount,
      extracted_transaction_id: adminExtraction.extracted_transaction_id,
      extracted_reference_code: adminExtraction.extracted_reference_code,
      extracted_datetime: adminExtraction.extracted_datetime,
      extracted_sender: adminExtraction.extracted_sender,
      extracted_receiver: adminExtraction.extracted_receiver,
      raw_json: adminExtraction,
    });

    // Update request status
    await supabase
      .from('mmg_payment_requests')
      .update({
        status: 'admin_uploaded',
        admin_uploaded_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    // Verify payment
    const verification = verifyPayment(request, userExtraction, adminExtraction);

    if (verification.verified) {
      // Mark as verified
      await supabase
        .from('mmg_payment_requests')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
        })
        .eq('id', request_id);

      // Upgrade user subscription
      await supabase
        .from('user_subscriptions')
        .update({
          plan: request.plan,
          status: 'active',
          plan_started_at: new Date().toISOString(),
          plan_ends_at: null, // Monthly subscription, can be updated if needed
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', request.user_id);

      // Create notification for user
      await supabase.from('user_notifications').insert({
        user_id: request.user_id,
        type: 'plan_paid_success',
        payload: {
          plan: request.plan,
          request_id: request.id,
        },
        is_read: false,
      });

      // Create celebration entry for plan upgrade
      await supabase.from('user_celebrations').insert({
        user_id: request.user_id,
        goal_id: null,
        badge_id: null,
        phase_number: null,
        badge_name: `${request.plan.toUpperCase()} Plan Activated`,
        message: `Congratulations! Your ${request.plan.toUpperCase()} plan has been activated. Enjoy all the premium features!`,
        shown: false,
      });

      // Log events
      await supabase.from('mmg_payment_events').insert([
        {
          request_id,
          actor_user_id: user.id,
          actor_role: 'admin',
          event_type: 'ADMIN_VERIFIED',
          details: { verification },
        },
        {
          request_id,
          actor_user_id: request.user_id,
          actor_role: 'system',
          event_type: 'PLAN_UPGRADED',
          details: { plan: request.plan },
        },
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          message: 'Payment verified and user plan upgraded successfully',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Verification failed
      await supabase
        .from('mmg_payment_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          last_error: verification.errors.join('; '),
        })
        .eq('id', request_id);

      await supabase.from('mmg_payment_events').insert({
        request_id,
        actor_user_id: user.id,
        actor_role: 'admin',
        event_type: 'ADMIN_REJECTED',
        details: { errors: verification.errors },
      });

      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          errors: verification.errors,
          message: 'Payment verification failed',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in mmg-parse-admin-received:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

