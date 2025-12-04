
import React from 'react';
import NeonDatePicker from '../NeonDatePicker';
import { Plane, MapPin } from 'lucide-react';

const BookingHeroExample = () => {
  return (
    <div className="min-h-screen bg-[#050b14] relative overflow-hidden flex items-center justify-center" dir="rtl">
       {/* Background */}
       <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-30"></div>
       <div className="absolute inset-0 bg-gradient-to-t from-[#050b14] via-[#050b14]/80 to-transparent"></div>
       
       <div className="relative z-10 w-full max-w-4xl px-6 text-center">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon/10 text-neon border border-neon/20 mb-6 text-sm font-medium backdrop-blur-md">
              <Plane className="w-4 h-4" />
              <span>سفر رویایی خود را آغاز کنید</span>
           </div>

           <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
              کاوش جهان با <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-purple-400">
                سرعت نـور
              </span>
           </h1>
           
           <p className="text-slate-300 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              رزرو هتل‌های لوکس و پروازهای فرست کلاس با تجربه‌ای متفاوت. 
              تاریخ سفر خود را انتخاب کنید و چمدان‌ها را ببندید.
           </p>

           <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 rounded-3xl inline-flex flex-col md:flex-row items-center gap-4 shadow-2xl max-w-full">
               <div className="flex items-center gap-3 bg-white/5 border border-white/10 h-16 rounded-2xl px-4 w-full md:w-64 flex-shrink">
                  <MapPin className="text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="مقصد شما کجاست؟" 
                    className="bg-transparent border-none outline-none text-white w-full placeholder:text-slate-500 text-right min-w-0"
                  />
               </div>

               <div className="h-8 w-px bg-white/10 hidden md:block flex-shrink-0"></div>
               
               {/* Picker as Hero CTA */}
               <div className="relative z-20 flex-shrink-0">
                   <NeonDatePicker />
               </div>

               <button className="h-16 px-8 rounded-2xl bg-neon text-black font-bold text-lg hover:bg-[#33f2ff] transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] w-full md:w-auto mt-4 md:mt-0 flex-shrink-0 whitespace-nowrap">
                  جستجو
               </button>
           </div>
       </div>
    </div>
  );
};

export default BookingHeroExample;
