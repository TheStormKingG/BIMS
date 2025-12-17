import { SpentItem } from './spentTableDatabase';
import { createTip } from './tipsDatabase';
import { getUserPreferences } from './tipsDatabase';

export interface SpendingAnalysis {
  totalSpent: number;
  averageDaily: number;
  topCategory: { name: string; amount: number } | null;
  topMerchant: { name: string; amount: number } | null;
  spendingTrend: 'increasing' | 'decreasing' | 'stable';
  categories: Array<{ name: string; amount: number; percentage: number }>;
}

/**
 * Analyze spending patterns to generate insights
 */
export const analyzeSpending = (spentItems: SpentItem[]): SpendingAnalysis => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const last30Days = spentItems.filter(item => new Date(item.transactionDateTime) >= thirtyDaysAgo);
  const last15Days = last30Days.filter(item => new Date(item.transactionDateTime) >= fifteenDaysAgo);
  const first15Days = last30Days.filter(item => {
    const itemDate = new Date(item.transactionDateTime);
    return itemDate >= thirtyDaysAgo && itemDate < fifteenDaysAgo;
  });

  const totalSpent = last30Days.reduce((sum, item) => sum + item.itemTotal, 0);
  const averageDaily = totalSpent / 30;

  // Calculate spending trend
  const recentSpending = last15Days.reduce((sum, item) => sum + item.itemTotal, 0);
  const earlierSpending = first15Days.reduce((sum, item) => sum + item.itemTotal, 0);
  let spendingTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (recentSpending > earlierSpending * 1.1) {
    spendingTrend = 'increasing';
  } else if (recentSpending < earlierSpending * 0.9) {
    spendingTrend = 'decreasing';
  }

  // Top category
  const categoryTotals: Record<string, number> = {};
  last30Days.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.itemTotal;
  });
  const topCategoryEntry = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])[0];
  const topCategory = topCategoryEntry
    ? { name: topCategoryEntry[0], amount: topCategoryEntry[1] }
    : null;

  // Top merchant (using source for now, since we don't have merchant field in spent_table)
  const merchantTotals: Record<string, number> = {};
  last30Days.forEach(item => {
    const merchantKey = item.source === 'SCAN_RECEIPT' ? 'Receipts' : item.source || 'Other';
    merchantTotals[merchantKey] = (merchantTotals[merchantKey] || 0) + item.itemTotal;
  });
  const topMerchantEntry = Object.entries(merchantTotals)
    .sort((a, b) => b[1] - a[1])[0];
  const topMerchant = topMerchantEntry
    ? { name: topMerchantEntry[0], amount: topMerchantEntry[1] }
    : null;

  // Categories with percentages
  const categories = Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalSpent,
    averageDaily,
    topCategory,
    topMerchant,
    spendingTrend,
    categories,
  };
};

/**
 * Generate tips based on spending analysis
 */
export const generateTips = async (spentItems: SpentItem[]): Promise<string[]> => {
  if (spentItems.length === 0) {
    return [];
  }

  const analysis = analyzeSpending(spentItems);
  const tips: string[] = [];

  // Tip 1: Spending trend
  if (analysis.spendingTrend === 'increasing') {
    tips.push(
      `Your spending has increased by over 10% in the last 15 days. Consider reviewing your recent purchases to identify areas where you can cut back.`
    );
  } else if (analysis.spendingTrend === 'decreasing') {
    tips.push(
      `Great job! Your spending has decreased by over 10% in the last 15 days. Keep up the good work!`
    );
  }

  // Tip 2: Top category
  if (analysis.topCategory && analysis.topCategory.amount > analysis.totalSpent * 0.3) {
    tips.push(
      `You're spending ${Math.round((analysis.topCategory.amount / analysis.totalSpent) * 100)}% of your budget on ${analysis.topCategory.name}. Consider setting a spending limit for this category.`
    );
  }

  // Tip 3: Average daily spending
  if (analysis.averageDaily > 5000) {
    tips.push(
      `Your average daily spending is $${Math.round(analysis.averageDaily).toLocaleString()} GYD. Setting a daily budget could help you save more.`
    );
  }

  // Tip 4: Category diversity
  if (analysis.categories.length < 3) {
    tips.push(
      `You're spending in only ${analysis.categories.length} categories. Diversifying your spending tracking can help you identify more savings opportunities.`
    );
  } else if (analysis.categories.length > 8) {
    tips.push(
      `You're tracking spending across ${analysis.categories.length} categories. Consider consolidating similar categories for better insights.`
    );
  }

  // Tip 5: High spending alert
  if (analysis.totalSpent > 50000) {
    tips.push(
      `You've spent $${Math.round(analysis.totalSpent).toLocaleString()} GYD in the last 30 days. Review your largest expenses to identify potential savings.`
    );
  }

  return tips;
};

/**
 * Check if tips should be generated based on frequency preference
 */
export const shouldGenerateTips = async (): Promise<boolean> => {
  try {
    const preferences = await getUserPreferences();
    
    if (preferences.tipsFrequency === 'off') {
      return false;
    }

    // Check when last tip was generated
    const { fetchAllTips } = await import('./tipsDatabase');
    const allTips = await fetchAllTips(1);
    
    if (allTips.length === 0) {
      return true; // Generate first tip
    }

    const lastTipDate = new Date(allTips[0].generatedAt);
    const now = new Date();
    const daysSinceLastTip = (now.getTime() - lastTipDate.getTime()) / (1000 * 60 * 60 * 24);

    switch (preferences.tipsFrequency) {
      case 'daily':
        return daysSinceLastTip >= 1;
      case 'weekly':
        return daysSinceLastTip >= 7;
      case 'monthly':
        return daysSinceLastTip >= 30;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking tip generation:', error);
    return false;
  }
};

/**
 * Generate and save tips for the user
 */
export const generateAndSaveTips = async (spentItems: SpentItem[]): Promise<void> => {
  try {
    const shouldGenerate = await shouldGenerateTips();
    if (!shouldGenerate) {
      return;
    }

    const tips = await generateTips(spentItems);
    
    // Save up to 3 most relevant tips
    for (const tipText of tips.slice(0, 3)) {
      await createTip(tipText, 'spending');
    }
  } catch (error) {
    console.error('Error generating tips:', error);
    // Don't throw - tip generation is non-critical
  }
};

