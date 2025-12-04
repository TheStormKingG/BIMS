import React from 'react';
import { Account, Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  totalBalance: number;
}

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46', '#064e3b'];

export const Dashboard: React.FC<DashboardProps> = ({ accounts, transactions, totalBalance }) => {
  
  // Calculate category spend
  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.forEach(t => {
      t.items.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + item.total;
      });
    });
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Total Net Worth Card - Dark Theme */}
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
                {transactions.length} Total
              </span>
           </div>
           
           <div className="space-y-4">
             {recentTransactions.length > 0 ? (
               recentTransactions.map(tx => (
                 <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                          <ArrowDownRight className="w-5 h-5 text-rose-500" />
                       </div>
                       <div>
                         <p className="font-semibold text-slate-900 line-clamp-1">{tx.merchant}</p>
                         <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">-${tx.totalAmount.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{tx.items.length} items</p>
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
