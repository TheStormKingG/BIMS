import React, { useEffect } from 'react';
import { Account } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, DollarSign, Clock, Download } from 'lucide-react';
import { SpentItem } from '../services/spentTableDatabase';
import { calculateTimeBasedAnalytics } from '../services/analyticsService';
import { Tips } from './Tips';
import { useTips } from '../hooks/useTips';
import { generateAndSaveTips } from '../services/tipGenerator';
import { exportOverviewToPdf } from '../services/exportsService';
import { emitEvent } from '../services/eventService';

interface DashboardProps {
  accounts: Account[];
  spentItems: SpentItem[];
  totalBalance: number;
}

// Guyana flag colors: Green (#00A651), Yellow (#FCD116), Red (#CE1126), Black (#000000), White (#FFFFFF)
// Using flag colors in a visually appealing order for charts
const COLORS = ['#00A651', '#FCD116', '#CE1126', '#10b981', '#059669', '#FCDD09', '#E31837', '#000000'];

export const Dashboard: React.FC<DashboardProps> = ({ accounts, spentItems, totalBalance }) => {
  const [timePeriod, setTimePeriod] = React.useState<'7days' | '1month' | '90days' | '3months' | '6months' | '1year' | 'alltime'>('1month');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const { tips, markAsRead, removeTip, refresh: refreshTips } = useTips();

  // Emit event when dashboard is viewed
  React.useEffect(() => {
    emitEvent('VIEW_OVERVIEW').catch(err => console.error('Error emitting VIEW_OVERVIEW event:', err));
  }, []);

  // Generate tips on mount and when spentItems change (if needed)
  React.useEffect(() => {
    if (spentItems.length > 0) {
      generateAndSaveTips(spentItems).then(() => {
        refreshTips();
      }).catch(err => {
        console.error('Failed to generate tips:', err);
      });
    }
  }, [spentItems.length]); // Only run when count changes to avoid infinite loops
  
  // Calculate category spend
  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    spentItems.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + item.itemTotal;
    });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [spentItems]);

  // Get unique categories for dropdown
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set<string>();
    spentItems.forEach(item => {
      if (item.category) {
        uniqueCategories.add(item.category);
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [spentItems]);

  // Calculate comprehensive time-based analytics using analytics service
  const analytics = React.useMemo(() => {
    return calculateTimeBasedAnalytics(spentItems);
  }, [spentItems]);

  // Legacy spendingMetrics for backward compatibility (uses analytics data)
  const spendingMetrics = React.useMemo(() => {
    return {
      spentToday: analytics.spentLast24Hours, // Use 24h for "today" (Pro feature: rolling 24h)
      spentLast7Days: analytics.spentLast7Days,
      spentLast30Days: analytics.spentLast30Days,
      avgDaily: analytics.avgDaily,
      avgWeekly: analytics.avgWeekly,
      avgMonthly: analytics.avgMonthly,
    };
  }, [analytics]);

  // Calculate spending over time based on selected period
  const spendingOverTime = React.useMemo(() => {
    const now = new Date();
    let daysBack = 30; // Default to 1 month
    let dateFormat: 'day' | 'week' | 'month' = 'day';
    
    switch (timePeriod) {
      case '7days':
        daysBack = 7;
        dateFormat = 'day';
        break;
      case '1month':
        daysBack = 30;
        dateFormat = 'day';
        break;
      case '90days':
        daysBack = 90;
        dateFormat = 'week';
        break;
      case '3months':
        daysBack = 90;
        dateFormat = 'week';
        break;
      case '6months':
        daysBack = 180;
        dateFormat = 'week';
        break;
      case '1year':
        daysBack = 365;
        dateFormat = 'month';
        break;
      case 'alltime':
        // For all-time, we calculate from the oldest transaction
        if (spentItems.length > 0) {
          const oldestDate = new Date(Math.min(...spentItems.map(item => new Date(item.transactionDateTime).getTime())));
          const oldestDay = new Date(oldestDate.getFullYear(), oldestDate.getMonth(), oldestDate.getDate());
          const diffTime = now.getTime() - oldestDay.getTime();
          daysBack = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          // Use monthly aggregation for all-time if more than 1 year, otherwise weekly
          dateFormat = daysBack > 365 ? 'month' : 'week';
        } else {
          daysBack = 365;
          dateFormat = 'month';
        }
        break;
    }

    let startDate: Date;
    if (timePeriod === 'alltime' && spentItems.length > 0) {
      // For all-time, use the oldest transaction date
      const oldestTimestamp = Math.min(...spentItems.map(item => new Date(item.transactionDateTime).getTime()));
      startDate = new Date(oldestTimestamp);
    } else {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysBack);
    }

    // Filter by date and category
    const filtered = spentItems.filter(item => {
      const isInDateRange = new Date(item.transactionDateTime) >= startDate;
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return isInDateRange && matchesCategory;
    });

    // Group by date/week/month based on period
    const byPeriod: Record<string, number> = {};
    filtered.forEach(item => {
      const date = new Date(item.transactionDateTime);
      let periodKey: string;
      
      if (dateFormat === 'day') {
        periodKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (dateFormat === 'week') {
        // Get week start (Monday)
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        weekStart.setDate(diff);
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        // Month
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      byPeriod[periodKey] = (byPeriod[periodKey] || 0) + item.itemTotal;
    });

    // Create array for the selected period
    const result = [];
    const totalDays = daysBack;
    
    if (dateFormat === 'day') {
      for (let i = totalDays - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const day = date.getDate();
        const month = date.getMonth() + 1;
        result.push({
          date: `${month}/${day}`,
          fullDate: dateKey,
          amount: byPeriod[dateKey] || 0,
        });
      }
    } else if (dateFormat === 'week') {
      // Get all weeks in the period
      const weeks: string[] = [];
      for (let i = totalDays - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(date);
        weekStart.setDate(diff);
        const weekKey = weekStart.toISOString().split('T')[0];
        if (!weeks.includes(weekKey)) {
          weeks.push(weekKey);
        }
      }
      
      weeks.forEach(weekKey => {
        const weekStart = new Date(weekKey);
        const month = weekStart.getMonth() + 1;
        const day = weekStart.getDate();
        result.push({
          date: `${month}/${day}`,
          fullDate: weekKey,
          amount: byPeriod[weekKey] || 0,
        });
      });
    } else {
      // Month format
      const months: string[] = [];
      for (let i = totalDays - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!months.includes(monthKey)) {
          months.push(monthKey);
        }
      }
      
      months.forEach(monthKey => {
        const [year, month] = monthKey.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        result.push({
          date: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
          fullDate: monthKey,
          amount: byPeriod[monthKey] || 0,
        });
      });
    }

    return result;
  }, [spentItems, timePeriod, selectedCategory]);

  // Use recentActivity from analytics (last 10 items)
  const recentTransactions = analytics.recentActivity.slice(0, 3); // Show top 3 in compact view

  // Find the item with most money spent
  const topItem = React.useMemo(() => {
    const itemTotals: Record<string, number> = {};
    spentItems.forEach(item => {
      const key = item.item.toLowerCase();
      itemTotals[key] = (itemTotals[key] || 0) + item.itemTotal;
    });
    
    const sortedItems = Object.entries(itemTotals)
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedItems.length === 0) return null;
    
    const [itemName, totalSpent] = sortedItems[0];
    // Find the original item to get proper capitalization
    const originalItem = spentItems.find(item => item.item.toLowerCase() === itemName);
    
    return {
      name: originalItem?.item || itemName,
      totalSpent,
    };
  }, [spentItems]);

  // Calculate spending metrics for the top item
  const topItemMetrics = React.useMemo(() => {
    if (!topItem) {
      return {
        spentToday: 0,
        spentLast7Days: 0,
        spentLast30Days: 0,
        avgDaily: 0,
        avgWeekly: 0,
        avgMonthly: 0,
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Filter items by name (case-insensitive)
    const itemNameLower = topItem.name.toLowerCase();
    const itemTransactions = spentItems.filter(
      item => item.item.toLowerCase() === itemNameLower
    );

    // Total amounts spent
    const spentToday = itemTransactions
      .filter(item => new Date(item.transactionDateTime) >= today)
      .reduce((sum, item) => sum + item.itemTotal, 0);

    const spentLast7Days = itemTransactions
      .filter(item => new Date(item.transactionDateTime) >= weekAgo)
      .reduce((sum, item) => sum + item.itemTotal, 0);

    const spentLast30Days = itemTransactions
      .filter(item => new Date(item.transactionDateTime) >= monthAgo)
      .reduce((sum, item) => sum + item.itemTotal, 0);

    // Calculate days in period for averages
    const daysInWeek = Math.max(1, Math.ceil((now.getTime() - weekAgo.getTime()) / (1000 * 60 * 60 * 24)));
    const daysInMonth = Math.max(1, Math.ceil((now.getTime() - monthAgo.getTime()) / (1000 * 60 * 60 * 24)));

    // Averages
    const avgDaily = spentLast30Days / daysInMonth;
    const avgWeekly = spentLast30Days / (daysInMonth / 7);
    const avgMonthly = spentLast30Days;

    return {
      spentToday,
      spentLast7Days,
      spentLast30Days,
      avgDaily,
      avgWeekly,
      avgMonthly,
    };
  }, [spentItems, topItem]);

  const handleExportPdf = async () => {
    try {
      // Get user info for header
      const { getSupabase } = await import('../services/supabaseClient');
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      const userEmail = user?.email || undefined;
      const userAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
      
      await exportOverviewToPdf(accounts, spentItems, totalBalance, userEmail, userAvatarUrl);
      emitEvent('EXPORT_PDF', { type: 'overview', itemCount: spentItems.length }).catch(err => {
        console.error('Error emitting EXPORT_PDF event:', err);
      });
    } catch (err) {
      console.error('Error exporting overview PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportPdf}
          className="text-emerald-600 border border-emerald-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors flex items-center gap-2"
          title="Export Overview as PDF"
        >
          <Download className="w-4 h-4" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Tips Section */}
      {tips.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">💡 Spending Tips</h3>
          <Tips 
            tips={tips} 
            onMarkAsRead={markAsRead}
            onDismiss={removeTip}
          />
        </div>
      )}

      {/* Total Balance Card */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total Net Worth</h2>
            <div className="text-4xl font-bold tracking-tight">
              ${totalBalance.toLocaleString()} <span className="text-xl text-slate-500">GYD</span>
            </div>
          </div>
          <div className="p-3 bg-white/10 rounded-full">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <div className="mt-6 flex gap-4">
           {accounts.map(acc => {
              const bal = acc.type === 'CASH_WALLET' 
                ? ((acc as any).denominations && Object.entries((acc as any).denominations).reduce((sum:number, [d, c]: any) => sum + Number(d)*c, 0)) || acc.balance || 0
                : acc.balance || 0;
              return (
                <div key={acc.id} className="bg-white/5 rounded-lg p-3 flex-1 min-w-[120px]">
                  <p className="text-xs text-slate-400 mb-1">{acc.type === 'CASH_WALLET' ? 'Wallet' : acc.name}</p>
                  <p className="font-semibold">${bal.toLocaleString()}</p>
                </div>
              )
           })}
        </div>
      </div>

      {/* Spending Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Spent Last 24h</h3>
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${analytics.spentLast24Hours.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Rolling 24 hours</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Spent Last 7 Days</h3>
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${spendingMetrics.spentLast7Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total spent this week</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Spent Last 30 Days</h3>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${spendingMetrics.spentLast30Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total spent this month</p>
        </div>
      </div>

      {/* Spending Averages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Average Daily</h3>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${spendingMetrics.avgDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Per day (last 30 days)</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Average Weekly</h3>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${spendingMetrics.avgWeekly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Per week (last 30 days)</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Average Monthly</h3>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${spendingMetrics.avgMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Per month (last 30 days)</p>
        </div>
      </div>

      {/* Spending Over Time Graph */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Money Spent Over Time</h3>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as '7days' | '1month' | '90days' | '3months' | '6months' | '1year' | 'alltime')}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="7days">7 Days</option>
              <option value="1month">1 Month</option>
              <option value="90days">90 Days</option>
              <option value="3months">3 Months</option>
              <option value="6months">6 Months</option>
              <option value="1year">1 Year</option>
              <option value="alltime">All Time</option>
            </select>
          </div>
        </div>
        <div className="w-full" style={{ height: '320px', minHeight: '320px' }}>
          {spendingOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={spendingOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#fff'
                  }}
                  labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#059669" 
                  strokeWidth={2}
                  dot={{ fill: '#059669', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              No spending data yet
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spending Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">Spending by Category</h3>
          <div className="w-full" style={{ height: '256px', minHeight: '256px' }}>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" fontSize={12} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No spending data yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity - Show 10 most recent items */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Recent Activity</h3>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {spentItems.length} Total
              </span>
           </div>
           
           <div className="space-y-3 max-h-[600px] overflow-y-auto">
             {analytics.recentActivity.length > 0 ? (
               analytics.recentActivity.slice(0, 10).map(item => (
                 <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                       <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                          <ArrowDownRight className="w-5 h-5 text-rose-500" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="font-semibold text-slate-900 truncate">{item.item}</p>
                         <div className="flex items-center gap-2 mt-1">
                           <p className="text-xs text-slate-500">{new Date(item.transactionDateTime).toLocaleString()}</p>
                           <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded">{item.category}</span>
                         </div>
                       </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-bold text-slate-900">${item.itemTotal.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Qty: {item.itemQty}</p>
                    </div>
                 </div>
               ))
             ) : (
               <div className="text-center text-slate-400 text-sm py-8">
                 No transactions recorded
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Most Money Spent On Section - Show Top Category (Pro feature) */}
      {analytics.topCategory && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 text-xl">
            Most Money Spent On: <span className="text-emerald-600">{analytics.topCategory.name}</span>
          </h3>
          <div className="mb-4">
            <p className="text-3xl font-bold text-slate-900">
              ${analytics.topCategory.amount.toLocaleString()} GYD
            </p>
            <p className="text-sm text-slate-500 mt-1">Total spent on {analytics.topCategory.name} category</p>
          </div>
        </div>
      )}

      {/* Most Money Spent On Item (Detailed breakdown - optional, show if topItem exists) */}
      {topItem && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 text-xl">
            Top Spending Item: <span className="text-emerald-600">{topItem.name}</span>
          </h3>
          
          {/* Spending Totals for Top Item */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Spent Today</h4>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                ${topItemMetrics.spentToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total spent today</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Spent Last 7 Days</h4>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                ${topItemMetrics.spentLast7Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total spent this week</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Spent Last 30 Days</h4>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                ${topItemMetrics.spentLast30Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total spent this month</p>
            </div>
          </div>

          {/* Spending Averages for Top Item */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Average Daily</h4>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                ${topItemMetrics.avgDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">Per day (last 30 days)</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Average Weekly</h4>
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                ${topItemMetrics.avgWeekly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">Per week (last 30 days)</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-600">Average Monthly</h4>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                ${topItemMetrics.avgMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">Per month (last 30 days)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
