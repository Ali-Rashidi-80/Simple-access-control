
import React from 'react';
import NeonDatePicker from '../NeonDatePicker';
import { User, Mail, Shield, Bell } from 'lucide-react';

const SettingsFormExample = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8" dir="rtl">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon/5 blur-[100px] rounded-full pointer-events-none"></div>

            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <div className="w-2 h-8 bg-neon rounded-full"></div>
                تنظیمات حساب کاربری
            </h2>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400 flex items-center gap-2">
                            <User className="w-4 h-4" /> نام کامل
                        </label>
                        <input type="text" defaultValue="آرش کمانگیر" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-neon/50 focus:outline-none transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400 flex items-center gap-2">
                            <Mail className="w-4 h-4" /> ایمیل
                        </label>
                        <input type="email" defaultValue="arash@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-neon/50 focus:outline-none transition-colors" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-neon font-medium flex items-center gap-2 mb-3">
                        <Bell className="w-4 h-4" /> بازه زمانی گزارش‌گیری (فعال)
                    </label>
                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-sm text-slate-400 leading-relaxed">
                            لطفا بازه زمانی مورد نظر خود برای دریافت گزارش‌های عملکرد ماهانه را انتخاب کنید. 
                            سیستم به طور خودکار در این بازه ایمیل ارسال می‌کند.
                        </div>
                        <div className="flex-shrink-0">
                             <NeonDatePicker />
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-800 flex justify-end gap-4">
                    <button className="px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        لغو تغییرات
                    </button>
                    <button className="px-8 py-3 rounded-xl bg-neon text-black font-bold hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all">
                        ذخیره تنظیمات
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SettingsFormExample;
