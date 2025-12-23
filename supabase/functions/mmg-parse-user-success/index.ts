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
Analyze this MMG (Mobile Money Guyana) payment success screenshot.

Extract the following information from the image:
- transaction_id: The transaction ID or reference number
- amount: The payment amount (as a number, in GYD if mentioned)
- datetime: The transaction date and time (in ISO 8601 format if possible)
- reference_code: A 24-character alphanumeric code that appears in the message (look for "REF:" followed by code)
- sender: The sender's name or phone number
- receiver: The receiver's name or phone number (should be 6335874 or Stashway)

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
    
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const extracted = JSON.parse(jsonMatch[0]) as ExtractionResult;
    
    // Validate and clean reference_code (must be exactly 24 chars if present)
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

async function sendAdminEmail(
  supabase: any,
  request: any,
  userEmail: string,
  extraction: ExtractionResult,
  imageUrl: string
): Promise<void> {
  const verifyUrl = `${Deno.env.get('SITE_URL') || 'https://stashway.app'}/admin/mmg/verify?request_id=${request.id}`;
  
  const emailBody = `
A user has uploaded a payment screenshot for verification.

User: ${userEmail}
Plan: ${request.plan.toUpperCase()}
Amount Expected: GYD ${request.amount_expected}
Reference Code: ${request.reference_code}

Extracted Information:
- Amount: ${extraction.extracted_amount || 'N/A'}
- Transaction ID: ${extraction.extracted_transaction_id || 'N/A'}
- Reference Code: ${extraction.extracted_reference_code || 'N/A'}
- Date/Time: ${extraction.extracted_datetime || 'N/A'}
- Sender: ${extraction.extracted_sender || 'N/A'}
- Receiver: ${extraction.extracted_receiver || 'N/A'}

Screenshot: ${imageUrl}

Please verify this payment by clicking the link below:
${verifyUrl}
`;

  // Send email to both admin addresses
  // Note: This requires Supabase email function or external email service
  // For now, we'll use Supabase's database to trigger an email (via webhook/trigger)
  // Or use a service like Resend, SendGrid, etc.
  
  // Store email notification in database (can be picked up by a cron job/webhook)
  await supabase.from('mmg_payment_events').insert({
    request_id: request.id,
    actor_role: 'system',
    event_type: 'ADMIN_EMAIL_SENT',
    details: {
      admin_emails: ADMIN_EMAILS,
      extraction,
    },
  });

  // TODO: Integrate actual email sending service here
  console.log('Email would be sent to:', ADMIN_EMAILS);
  console.log('Email body:', emailBody);
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
      .eq('user_id', user.id)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Payment request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download image from storage
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
    let extraction: ExtractionResult;
    try {
      extraction = await extractPaymentInfo(base64);
    } catch (error) {
      console.error('AI extraction error:', error);
      
      // Update request with error
      await supabase
        .from('mmg_payment_requests')
        .update({
          status: 'user_uploaded',
          last_error: `AI extraction failed: ${error.message}`,
        })
        .eq('id', request_id);

      return new Response(
        JSON.stringify({ error: 'Failed to extract payment information', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store extraction
    const { error: extractionError } = await supabase
      .from('mmg_payment_extractions')
      .insert({
        request_id,
        kind: 'user_success',
        extracted_amount: extraction.extracted_amount,
        extracted_transaction_id: extraction.extracted_transaction_id,
        extracted_reference_code: extraction.extracted_reference_code,
        extracted_datetime: extraction.extracted_datetime,
        extracted_sender: extraction.extracted_sender,
        extracted_receiver: extraction.extracted_receiver,
        raw_json: extraction,
      });

    if (extractionError) {
      console.error('Error storing extraction:', extractionError);
    }

    // Update request status
    await supabase
      .from('mmg_payment_requests')
      .update({
        status: 'ai_parsed',
        user_uploaded_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    // Get signed URL for image
    const { data: urlData } = await supabase.storage
      .from('mmg_payments')
      .createSignedUrl(storage_path, 3600); // 1 hour expiry

    const imageUrl = urlData?.signedUrl || '';

    // Send admin email
    const { data: userData } = await supabase.auth.admin.getUserById(user.id);
    const userEmail = userData?.user?.email || 'unknown';
    
    try {
      await sendAdminEmail(supabase, request, userEmail, extraction, imageUrl);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    // Log event
    await supabase.from('mmg_payment_events').insert({
      request_id,
      actor_user_id: user.id,
      actor_role: 'user',
      event_type: 'USER_UPLOADED',
      details: { extraction },
    });

    return new Response(
      JSON.stringify({
        success: true,
        extraction,
        message: 'Payment screenshot uploaded and processed. Waiting for admin verification.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mmg-parse-user-success:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

