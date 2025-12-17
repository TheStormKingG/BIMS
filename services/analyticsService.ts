import { SpentItem } from './spentTableDatabase';

export interface TimeBasedAnalytics {
  spentLast24Hours: number;
  spentLast7Days: number;
  spentLast30Days: number;
  avgDaily: number;
  avgWeekly: number;
  avgMonthly: number;
  recentActivity: SpentItem[];
  topMerchant: { name: string; amount: number } | null;
  topCategory: { name: string; amount: number } | null;
  spendingByCategory: Array<{ category: string; amount: number; percentage: number }>;
}

/**
 * Calculate comprehensive time-based analytics
 * All calculations are timezone-safe using Date objects
 */
export const calculateTimeBasedAnalytics = (spentItems: SpentItem[]): TimeBasedAnalytics => {
  const now = new Date();
  
  // 24 hours ago (rolling, not calendar day)
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // 7 days ago (from start of today)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  // 30 days ago (from start of today)
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  // Filter items by time periods
  const itemsLast24h = spentItems.filter(item => {
    const itemDate = new Date(item.transactionDateTime);
    return itemDate >= last24Hours;
  });

  const itemsLast7d = spentItems.filter(item => {
    const itemDate = new Date(item.transactionDateTime);
    return itemDate >= weekAgo;
  });

  const itemsLast30d = spentItems.filter(item => {
    const itemDate = new Date(item.transactionDateTime);
    return itemDate >= monthAgo;
  });

  // Calculate totals
  const spentLast24Hours = itemsLast24h.reduce((sum, item) => sum + item.itemTotal, 0);
  const spentLast7Days = itemsLast7d.reduce((sum, item) => sum + item.itemTotal, 0);
  const spentLast30Days = itemsLast30d.reduce((sum, item) => sum + item.itemTotal, 0);

  // Calculate averages
  const daysInWeek = Math.max(1, Math.ceil((now.getTime() - weekAgo.getTime()) / (1000 * 60 * 60 * 24)));
  const daysInMonth = Math.max(1, Math.ceil((now.getTime() - monthAgo.getTime()) / (1000 * 60 * 60 * 24)));
  
  const avgDaily = daysInMonth > 0 ? spentLast30Days / daysInMonth : 0;
  const avgWeekly = daysInMonth > 0 ? spentLast30Days / (daysInMonth / 7) : 0;
  const avgMonthly = spentLast30Days;

  // Recent activity (last 10 transactions, most recent first)
  const recentActivity = [...spentItems]
    .sort((a, b) => new Date(b.transactionDateTime).getTime() - new Date(a.transactionDateTime).getTime())
    .slice(0, 10);

  // Top merchant (by total spent)
  const merchantTotals: Record<string, number> = {};
  spentItems.forEach(item => {
    // Extract merchant from source if available, or use a placeholder
    // Note: spent_table doesn't have merchant field directly, so we'll use source for now
    // This assumes source contains merchant info, or we need to enhance the schema
    const merchantKey = item.source === 'SCAN_RECEIPT' ? 'Receipts' : item.source || 'Unknown';
    merchantTotals[merchantKey] = (merchantTotals[merchantKey] || 0) + item.itemTotal;
  });

  const topMerchantEntry = Object.entries(merchantTotals)
    .sort((a, b) => b[1] - a[1])[0];
  const topMerchant = topMerchantEntry 
    ? { name: topMerchantEntry[0], amount: topMerchantEntry[1] }
    : null;

  // Top category (by total spent)
  const categoryTotals: Record<string, number> = {};
  spentItems.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.itemTotal;
  });

  const topCategoryEntry = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])[0];
  const topCategory = topCategoryEntry
    ? { name: topCategoryEntry[0], amount: topCategoryEntry[1] }
    : null;

  // Spending by category (with percentages)
  const totalSpent = spentLast30Days;
  const spendingByCategory = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    spentLast24Hours,
    spentLast7Days,
    spentLast30Days,
    avgDaily,
    avgWeekly,
    avgMonthly,
    recentActivity,
    topMerchant,
    topCategory,
    spendingByCategory,
  };
};

