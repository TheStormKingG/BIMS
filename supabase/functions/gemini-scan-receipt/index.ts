import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.2.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ReceiptScanResult {
  merchant: string;
  date: string;
  total: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    category: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Verify authentication
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

    // Get request body
    const { base64Image } = await req.json();
    
    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: 'Missing base64Image in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gemini API key from environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured in Supabase Edge Function secrets');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            merchant: { type: 'string' },
            date: { type: 'string', description: 'YYYY-MM-DD format' },
            total: { type: 'number' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                  total: { type: 'number' },
                  category: { type: 'string' }
                },
                required: ['description', 'quantity', 'unitPrice', 'total', 'category']
              }
            }
          },
          required: ['merchant', 'date', 'items', 'total']
        }
      }
    });

    const prompt = `
      Analyze this image of a receipt (or text message/email receipt).
      Extract the merchant name, transaction date (YYYY-MM-DD), and a list of purchased items.
      For each item, extract the description, quantity (default to 1 if not found), unit price, and total price.
      Infer a category for each item from this list: [Groceries, Dining Out, Transport, Utilities, Entertainment, Shopping, Health, Education, Other].
      Return the total amount of the receipt.
      If the image is not a receipt or unclear, do your best to extract what looks like transaction data.
      Values should be in numbers (GYD).
    `;

    // Call Gemini API
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    let data: ReceiptScanResult;
    try {
      data = JSON.parse(text) as ReceiptScanResult;
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      throw new Error('Invalid response format from AI');
    }
    
    // Fallback/Cleanup if AI misses something critical
    if (!data.date) data.date = new Date().toISOString().split('T')[0];
    if (!data.items) data.items = [];
    
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gemini-scan-receipt:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to scan receipt', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

