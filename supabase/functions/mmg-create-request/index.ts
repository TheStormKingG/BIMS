import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanPrices {
  [key: string]: number;
}

const PLAN_PRICES: PlanPrices = {
  personal: 1881, // $9 USD * 209 GYD/USD
  pro: 3762, // $18 USD * 209 GYD/USD
  pro_max: 9405, // $45 USD * 209 GYD/USD
};

function generateReferenceCode(): string {
  // Generate 24-character uppercase alphanumeric code (no ambiguous chars)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
  let code = '';
  for (let i = 0; i < 24; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateReferenceSecret(): string {
  // Generate 32+ character cryptographically random secret
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < array.length; i++) {
    secret += chars[array[i] % chars.length];
  }
  return secret;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { plan } = await req.json();
    
    if (!plan || !['personal', 'pro', 'pro_max'].includes(plan)) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate amount
    const amountExpected = PLAN_PRICES[plan];
    if (!amountExpected) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan pricing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate reference code and secret
    const referenceCode = generateReferenceCode();
    const referenceSecret = generateReferenceSecret();
    const generatedMessage = `STASHWAY ${plan.toUpperCase()} PAYMENT - REF:${referenceCode}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

    // Insert payment request
    const { data: request, error: insertError } = await supabase
      .from('mmg_payment_requests')
      .insert({
        user_id: user.id,
        plan,
        amount_expected: amountExpected,
        currency: 'GYD',
        reference_code: referenceCode,
        reference_secret: referenceSecret,
        generated_message: generatedMessage,
        status: 'generated',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating payment request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment request', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log event
    await supabase.from('mmg_payment_events').insert({
      request_id: request.id,
      actor_user_id: user.id,
      actor_role: 'user',
      event_type: 'REQUEST_CREATED',
      details: { plan, amount_expected: amountExpected },
    });

    // Return response (DO NOT include reference_secret)
    return new Response(
      JSON.stringify({
        request_id: request.id,
        generated_message: generatedMessage,
        reference_code: referenceCode,
        amount_expected: amountExpected,
        payee_phone: '6335874',
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mmg-create-request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

