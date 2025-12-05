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

  // Calculate spending averages
  const spendingAverages = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const daySpend = spentItems
      .filter(item => new Date(item.transactionDateTime) >= today)
      .reduce((sum, item) => sum + item.itemTotal, 0);

    const weekSpend = spentItems
      .filter(item => new Date(item.transactionDateTime) >= weekAgo)
      .reduce((sum, item) => sum + item.itemTotal, 0);

    const monthSpend = spentItems
      .filter(item => new Date(item.transactionDateTime) >= monthAgo)
      .reduce((sum, item) => sum + item.itemTotal, 0);

    // Calculate days in period
    const daysInWeek = Math.max(1, Math.ceil((now.getTime() - weekAgo.getTime()) / (1000 * 60 * 60 * 24)));
    const daysInMonth = Math.max(1, Math.ceil((now.getTime() - monthAgo.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      perDay: daySpend,
      perWeek: weekSpend / daysInWeek,
      perMonth: monthSpend / daysInMonth,
    };
  }, [spentItems]);

  // Calculate spending over time (last 30 days)
  const spendingOverTime = React.useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filtered = spentItems.filter(
      item => new Date(item.transactionDateTime) >= thirtyDaysAgo
    );

    // Group by date
    const byDate: Record<string, number> = {};
    filtered.forEach(item => {
      const date = new Date(item.transactionDateTime);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      byDate[dateKey] = (byDate[dateKey] || 0) + item.itemTotal;
    });

    // Create array for last 30 days
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const day = date.getDate();
      const month = date.getMonth() + 1;
      result.push({
        date: `${month}/${day}`,
        fullDate: dateKey,
        amount: byDate[dateKey] || 0,
      });
    }

    return result;
  }, [spentItems]);

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
                ? Object.entries((acc as any).denominations).reduce((sum:number, [d, c]: any) => sum + Number(d)*c, 0)
                : acc.balance;
              return (
                <div key={acc.id} className="bg-white/5 rounded-lg p-3 flex-1 min-w-[120px]">
                  <p className="text-xs text-slate-400 mb-1">{acc.type === 'CASH_WALLET' ? 'Wallet' : acc.name}</p>
                  <p className="font-semibold">${bal.toLocaleString()}</p>
                </div>
              )
           })}
        </div>
      </div>

      {/* Spending Averages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Spend Per Day</h3>
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${spendingAverages.perDay.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Today's spending</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Spend Per Week</h3>
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${spendingAverages.perWeek.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Average daily (last 7 days)</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600">Spend Per Month</h3>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            ${spendingAverages.perMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Average daily (last 30 days)</p>
        </div>
      </div>

      {/* Spending Over Time Graph */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Money Spent Over Time</h3>
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
