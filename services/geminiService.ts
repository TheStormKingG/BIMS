import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptScanResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-2.5-flash';

export const parseReceiptImage = async (base64Image: string): Promise<ReceiptScanResult> => {
  try {
    const prompt = `
      Analyze this image of a receipt (or text message/email receipt).
      Extract the merchant name, transaction date (YYYY-MM-DD), and a list of purchased items.
      For each item, extract the description, quantity (default to 1 if not found), unit price, and total price.
      Infer a category for each item from this list: [Groceries, Dining Out, Transport, Utilities, Entertainment, Shopping, Health, Education, Other].
      Return the total amount of the receipt.
      If the image is not a receipt or unclear, do your best to extract what looks like transaction data.
      Values should be in numbers (GYD).
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming jpeg/png, standard for camera
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING, description: "YYYY-MM-DD format" },
            total: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  total: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                },
                required: ["description", "quantity", "unitPrice", "total", "category"]
              }
            }
          },
          required: ["merchant", "date", "items", "total"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text) as ReceiptScanResult;
    
    // Fallback/Cleanup if AI misses something critical
    if (!data.date) data.date = new Date().toISOString().split('T')[0];
    if (!data.items) data.items = [];
    
    return data;

  } catch (error) {
    console.error("Gemini Scan Error:", error);
    throw new Error("Failed to scan receipt. Please try again.");
  }
};
