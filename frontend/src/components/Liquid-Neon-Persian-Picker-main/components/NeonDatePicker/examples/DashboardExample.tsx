
import React, { useState } from 'react';
import NeonDatePicker from '../NeonDatePicker';
import { DateRange } from '../types';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

const DashboardExample = () => {
  const [range, setRange] = useState<DateRange>({ startDate: null, endDate: null });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6 md:p-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-black text-white mb-2">داشبورد مدیریت</h1>
           <p className="text-slate-400">تحلیل داده‌های فروش و عملکرد کاربران</p>
        </div>
        
        {/* Date Picker Component */}
        <div className="relative z-50">
           <NeonDatePicker onChange={setRange} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { icon: <TrendingUp />, label: "فروش کل", val: "۱۲۵,۰۰۰,۰۰۰", color: "text-neon" },
          { icon: <Users />, label: "کاربران جدید", val: "+۱,۲۴۰", color: "text-purple-400" },
          { icon: <DollarSign />, label: "درآمد خالص", val: "۴۵,۰۰۰,۰۰۰", color: "text-green-400" },
          { icon: <BarChart3 />, label: "نرخ تبدیل", val: "۳.۵٪", color: "text-rose-400" },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/50 border border-white/5 p-6 rounded-2xl backdrop-blur-sm hover:bg-slate-800/80 transition-all">
             <div className={`mb-4 ${stat.color} bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center`}>
                {stat.icon}
             </div>
             <div className="text-2xl font-bold text-white mb-1 font-mono">{stat.val}</div>
             <div className="text-sm text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Chart Placeholder */}
      <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-8 h-96 flex items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
         <div className="text-center">
            <BarChart3 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">نمودار تغییرات در بازه زمانی انتخاب شده</p>
            {range.startDate && (
               <p className="text-neon mt-2 font-mono text-sm opacity-80">
                 داده‌ها بروزرسانی شدند
               </p>
            )}
         </div>
      </div>
    </div>
  );
};

export default DashboardExample;
