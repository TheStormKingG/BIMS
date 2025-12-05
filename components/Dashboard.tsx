import React from 'react';
import { Account } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { SpentItem } from '../services/spentTableDatabase';

interface DashboardProps {
  accounts: Account[];
  spentItems: SpentItem[];
  totalBalance: number;
}

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46', '#064e3b'];

export const Dashboard: React.FC<DashboardProps> = ({ accounts, spentItems, totalBalance }) => {
  const [timePeriod, setTimePeriod] = React.useState<'7days' | '1month' | '3months' | '6months' | '1year'>('1month');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  
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

  // Calculate spending totals and averages
  const spendingMetrics = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Total amounts spent
    const spentToday = spentItems
      .filter(item => new Date(item.transactionDateTime) >= today)
      .reduce((sum, item) => sum + item.itemTotal, 0);

    const spentLast7Days = spentItems
      .filter(item => new Date(item.transactionDateTime) >= weekAgo)
      .reduce((sum, item) => sum + item.itemTotal, 0);

    const spentLast30Days = spentItems
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
  }, [spentItems]);

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
    }

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);

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

  const recentTransactions = [...spentItems]
    .sort((a, b) => new Date(b.transactionDateTime).getTime() - new Date(a.transactionDateTime).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
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
            <h3 className="text-sm font-medium text-slate-600">Spent Today</h3>
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${spendingMetrics.spentToday.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total spent today</p>
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
            <Calendar className="w-5 h-5 text-blue-600" />
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
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as '7days' | '1month' | '3months' | '6months' | '1year')}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="7days">7 Days</option>
            <option value="1month">1 Month</option>
            <option value="3months">3 Months</option>
            <option value="6months">6 Months</option>
            <option value="1year">1 Year</option>
          </select>
        </div>
        <div className="h-80">
          {spendingOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
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
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
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

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Recent Activity</h3>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {spentItems.length} Total
              </span>
           </div>
           
           <div className="space-y-4">
             {recentTransactions.length > 0 ? (
               recentTransactions.map(item => (
                 <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                          <ArrowDownRight className="w-5 h-5 text-rose-500" />
                       </div>
                       <div>
                         <p className="font-semibold text-slate-900 line-clamp-1">{item.item}</p>
                         <p className="text-xs text-slate-500">{new Date(item.transactionDateTime).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">-${item.itemTotal.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{item.category}</p>
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
    </div>
  );
};
