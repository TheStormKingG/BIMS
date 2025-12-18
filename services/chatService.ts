import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from './chatDatabase';
import { SpentItem } from './spentTableDatabase';
import { calculateTimeBasedAnalytics } from './analyticsService';

// Get API key from localStorage or environment variable
const getApiKey = (): string => {
  // First try localStorage (user can set this)
  const storedKey = localStorage.getItem('GEMINI_API_KEY');
  if (storedKey) return storedKey;
  
  // Fallback to environment variable (for local dev)
  const envKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (envKey) return envKey;
  
  // Prompt user for API key if not found
  const userKey = prompt('Please enter your Gemini API Key.\n\nYou can get one free at: https://aistudio.google.com/apikey\n\nThe key will be stored locally in your browser.');
  if (userKey) {
    localStorage.setItem('GEMINI_API_KEY', userKey);
    return userKey;
  }
  
  throw new Error('Gemini API key is required for AI chat');
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });
const modelName = 'gemini-2.5-flash';

/**
 * Generate AI response based on user message and spending data
 */
export const generateChatResponse = async (
  userMessage: string,
  messages: ChatMessage[],
  spentItems: SpentItem[]
): Promise<string> => {
  try {
    // Calculate analytics from user's spending data
    const analytics = calculateTimeBasedAnalytics(spentItems);
    
    // Build context about user's financial data
    const financialContext = buildFinancialContext(analytics, spentItems);
    
    // Build conversation history
    const conversationHistory = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    // Add system prompt with financial context
    const systemPrompt = `You are a helpful personal finance assistant for Stashway, a personal finance tracking app.

You have access to the user's financial data:
${financialContext}

Instructions:
- Answer questions about the user's spending, finances, and provide insights
- Be friendly, helpful, and concise
- Use the provided data to give specific, actionable advice
- If asked about data you don't have access to, say so politely
- Focus on helping the user understand their spending patterns and make better financial decisions
- All amounts are in Guyanese Dollars (GYD)

Current conversation:`;

    // Add user's message
    const userPrompt = `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`;

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...conversationHistory.slice(-10), // Last 10 messages for context
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });

    return response.text || 'I apologize, but I could not generate a response. Please try again.';
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw new Error('Failed to generate AI response. Please check your API key and try again.');
  }
};

/**
 * Build a summary of user's financial data for AI context
 */
function buildFinancialContext(analytics: ReturnType<typeof calculateTimeBasedAnalytics>, spentItems: SpentItem[]): string {
  const context = [
    `Total transactions: ${spentItems.length}`,
    `Spent last 24 hours: GYD ${analytics.spentLast24Hours.toLocaleString()}`,
    `Spent last 7 days: GYD ${analytics.spentLast7Days.toLocaleString()}`,
    `Spent last 30 days: GYD ${analytics.spentLast30Days.toLocaleString()}`,
    `Average daily spending: GYD ${analytics.avgDaily.toFixed(2)}`,
    `Average weekly spending: GYD ${analytics.avgWeekly.toFixed(2)}`,
    `Average monthly spending: GYD ${analytics.avgMonthly.toFixed(2)}`,
  ];

  if (analytics.topCategory) {
    context.push(`Top spending category: ${analytics.topCategory.name} (GYD ${analytics.topCategory.amount.toLocaleString()})`);
  }

  if (analytics.topMerchant) {
    context.push(`Top merchant: ${analytics.topMerchant.name} (GYD ${analytics.topMerchant.amount.toLocaleString()})`);
  }

  if (analytics.spendingByCategory.length > 0) {
    context.push('\nSpending by category:');
    analytics.spendingByCategory.slice(0, 5).forEach(cat => {
      context.push(`  - ${cat.category}: GYD ${cat.amount.toLocaleString()} (${cat.percentage.toFixed(1)}%)`);
    });
  }

  if (analytics.recentActivity.length > 0) {
    context.push('\nRecent transactions (last 5):');
    analytics.recentActivity.slice(0, 5).forEach(item => {
      const date = new Date(item.transactionDateTime).toLocaleDateString();
      context.push(`  - ${date}: ${item.category} - GYD ${item.itemTotal.toLocaleString()} (${item.itemDescription})`);
    });
  }

  return context.join('\n');
}

/**
 * Generate a short, descriptive name for a chat session based on the first user message
 */
export const generateChatName = async (firstUserMessage: string): Promise<string> => {
  try {
    const prompt = `Based on this user message, generate a short, descriptive chat title (maximum 4-5 words). 
Make it concise and relevant to the topic. Examples: "Monthly Spending Review", "Budget Planning", "Dining Expenses Question".
Just return the title, nothing else.

User message: "${firstUserMessage}"`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.5,
        maxOutputTokens: 50,
      }
    });

    const name = (response.text || firstUserMessage.substring(0, 30)).trim();
    // Ensure name is not too long
    return name.length > 50 ? name.substring(0, 47) + '...' : name;
  } catch (error) {
    console.error('Error generating chat name:', error);
    // Fallback to truncated first message
    return firstUserMessage.length > 30 
      ? firstUserMessage.substring(0, 27) + '...' 
      : firstUserMessage;
  }
}

