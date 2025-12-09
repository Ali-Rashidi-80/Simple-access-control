
import React, { useState } from 'react';
import NeonDatePicker from '../NeonDatePicker';
import { DateRange } from '../types';
import { 
  Layout, 
  Search, 
  Bell, 
  Menu, 
  CheckSquare, 
  Clock, 
  MoreHorizontal,
  Plus,
  Users
} from 'lucide-react';

const ProjectManagementExample = () => {
  const [dateFilter, setDateFilter] = useState<DateRange>({ startDate: null, endDate: null });

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 overflow-hidden font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-l border-white/5 flex-col hidden md:flex">
         <div className="p-6 flex items-center gap-3">
             <div className="w-8 h-8 bg-neon rounded-lg shadow-neon flex items-center justify-center text-black font-bold">P</div>
             <span className="text-white font-bold text-lg">پروجکت نئون</span>
         </div>

         <nav className="flex-1 px-4 space-y-1">
             <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 mt-4 px-2">منوی اصلی</div>
             {[
               { icon: <Layout size={18} />, label: "داشبورد", active: false },
               { icon: <CheckSquare size={18} />, label: "تسک‌ها", active: true },
               { icon: <Users size={18} />, label: "تیم‌ها", active: false },
               { icon: <Clock size={18} />, label: "زمان‌بندی", active: false },
             ].map((item, i) => (
               <button key={i} className={`flex items-center gap-3 w-full p-3 rounded-xl text-sm font-medium transition-colors ${item.active ? 'bg-neon/10 text-neon' : 'hover:bg-white/5 hover:text-white'}`}>
                   {item.icon}
                   {item.label}
               </button>
             ))}
         </nav>

         <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-rose-500"></div>
                <div>
                    <div className="text-white text-sm font-bold">علی رضایی</div>
                    <div className="text-xs text-slate-500">مدیر محصول</div>
                </div>
            </div>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
         {/* Top Header */}
         <header className="h-20 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-4">
               <button className="md:hidden p-2 text-slate-400"><Menu /></button>
               <h2 className="text-xl font-bold text-white hidden md:block">بورد اسپرینت ۴</h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                   <input 
                     type="text" 
                     placeholder="جستجو..." 
                     className="bg-slate-800 border border-white/5 rounded-xl h-10 pr-10 pl-4 text-sm focus:outline-none focus:border-neon/50 w-64 transition-colors"
                   />
                </div>
                
                {/* DATE PICKER IN HEADER TOOLBAR */}
                <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                    <span className="text-xs text-slate-500 hidden md:inline">فیلتر زمانی:</span>
                    <NeonDatePicker onChange={setDateFilter} />
                </div>

                <button className="p-2 relative text-slate-400 hover:text-white transition-colors">
                   <Bell size={20} />
                   <span className="absolute top-1 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
                </button>
            </div>
         </header>

         {/* Board Area */}
         <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <div className="flex gap-6 h-full min-w-max">
               {/* Column 1 */}
               <div className="w-80 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-white flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                         برای انجام
                      </span>
                      <span className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-400">4</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                      <TaskCard title="طراحی صفحه لاگین" tag="طراحی" color="bg-purple-500/20 text-purple-400" />
                      <TaskCard title="بررسی مستندات API" tag="بکند" color="bg-blue-500/20 text-blue-400" />
                      <TaskCard title="بهینه‌سازی دیتابیس" tag="دیتابیس" color="bg-rose-500/20 text-rose-400" />
                      <button className="w-full py-3 border border-dashed border-white/10 rounded-xl text-slate-500 text-sm hover:border-neon/50 hover:text-neon transition-colors flex items-center justify-center gap-2">
                          <Plus size={16} /> افزودن تسک
                      </button>
                  </div>
               </div>

               {/* Column 2 */}
               <div className="w-80 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-white flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-neon"></span>
                         در حال انجام
                      </span>
                      <span className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-400">2</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                      <TaskCard title="پیاده‌سازی Date Picker" tag="فرانت‌اند" color="bg-neon/10 text-neon" />
                      <TaskCard title="تست‌های واحد" tag="QA" color="bg-yellow-500/20 text-yellow-400" />
                  </div>
               </div>

               {/* Column 3 */}
               <div className="w-80 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-white flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-green-500"></span>
                         تکمیل شده
                      </span>
                      <span className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-400">5</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                      <TaskCard title="جلسه ابتدایی پروژه" tag="جلسه" color="bg-slate-700 text-slate-300" />
                  </div>
               </div>
            </div>
         </div>
      </main>
    </div>
  );
};

const TaskCard = ({ title, tag, color }: { title: string, tag: string, color: string }) => (
  <div className="bg-slate-900 border border-white/5 p-4 rounded-xl shadow-sm hover:border-white/20 transition-all cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
          <span className={`text-[10px] px-2 py-1 rounded ${color}`}>{tag}</span>
          <button className="text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={16} /></button>
      </div>
      <h4 className="text-slate-200 text-sm font-medium mb-4 leading-relaxed">{title}</h4>
      <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex -space-x-2 space-x-reverse">
              <div className="w-6 h-6 rounded-full bg-rose-500 border border-slate-900"></div>
              <div className="w-6 h-6 rounded-full bg-blue-500 border border-slate-900"></div>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-xs">
              <Clock size={12} />
              <span>2 روز</span>
          </div>
      </div>
  </div>
);

export default ProjectManagementExample;
