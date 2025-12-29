import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check API key
    const apiKey = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();

    if (!apiKey || !apiKey.startsWith("AIza")) {
      return new Response(
        JSON.stringify({ 
          error: "Bad or missing GEMINI_API_KEY", 
          key_prefix: apiKey.slice(0, 4), 
          key_len: apiKey.length 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Read JSON body
    const bodyText = await req.text();
    let body: any = {};
    try { 
      body = bodyText ? JSON.parse(bodyText) : {}; 
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", detail: String(parseError) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const base64Image = body.base64Image;
    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: "Missing base64Image in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `
Analyze this image of a receipt (or text message/email receipt).
Extract the merchant name, transaction date (YYYY-MM-DD), and a list of purchased items.
For each item, extract the description, quantity (default to 1 if not found), unit price, and total price.
Infer a category for each item from this list: [Groceries, Dining Out, Transport, Utilities, Entertainment, Shopping, Health, Education, Other].
Return the total amount of the receipt.
If the image is not a receipt or unclear, do your best to extract what looks like transaction data.
Values should be in numbers (GYD).

Return ONLY a JSON object with these exact keys:
{
  "merchant": string,
  "date": string (YYYY-MM-DD format),
  "total": number,
  "items": [
    {
      "description": string,
      "quantity": number,
      "unitPrice": number,
      "total": number,
      "category": string
    }
  ]
}
`;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" +
      `?key=${encodeURIComponent(apiKey)}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Image,
                  mimeType: "image/jpeg",
                },
              },
            ],
          },
        ],
      }),
    });

    const dataText = await r.text(); // keep raw for debugging
    if (!r.ok) {
      return new Response(
        JSON.stringify({
          error: "Gemini upstream error",
          upstream_status: r.status,
          upstream_body: dataText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse the response
    let data: any;
    try {
      data = JSON.parse(dataText);
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse Gemini response",
          raw_response: dataText,
          detail: String(parseError),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract text from Gemini response
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return new Response(
        JSON.stringify({
          error: "No text in Gemini response",
          raw_response: dataText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({
          error: "No JSON found in AI response",
          ai_response: text,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse the receipt data
    let receiptData: any;
    try {
      receiptData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: "Failed to parse receipt JSON",
          json_extract: jsonMatch[0],
          detail: String(parseError),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ensure required fields exist
    if (!receiptData.date) receiptData.date = new Date().toISOString().split('T')[0];
    if (!receiptData.items) receiptData.items = [];

    return new Response(JSON.stringify(receiptData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Unhandled exception", detail: String(e), stack: e?.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
