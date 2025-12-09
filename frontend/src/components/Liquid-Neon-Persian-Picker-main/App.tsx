
import React, { useState } from 'react';
import { LayoutDashboard, Plane, Settings, KanbanSquare } from 'lucide-react';
import DashboardExample from './components/NeonDatePicker/examples/DashboardExample';
import BookingHeroExample from './components/NeonDatePicker/examples/BookingHeroExample';
import SettingsFormExample from './components/NeonDatePicker/examples/SettingsFormExample';
import ProjectManagementExample from './components/NeonDatePicker/examples/ProjectManagementExample';

type ExampleType = 'dashboard' | 'booking' | 'settings' | 'project';

function App() {
  const [currentExample, setCurrentExample] = useState<ExampleType>('dashboard');

  const renderExample = () => {
    switch (currentExample) {
      case 'dashboard': return <DashboardExample />;
      case 'booking': return <BookingHeroExample />;
      case 'settings': return <SettingsFormExample />;
      case 'project': return <ProjectManagementExample />;
      default: return <DashboardExample />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'داشبورد', icon: <LayoutDashboard size={18} /> },
    { id: 'booking', label: 'لندینگ سفر', icon: <Plane size={18} /> },
    { id: 'project', label: 'مدیریت پروژه', icon: <KanbanSquare size={18} /> },
    { id: 'settings', label: 'فرم تنظیمات', icon: <Settings size={18} /> },
  ];

  return (
    <div className="relative">
      {/* Navigation Switcher (Fixed Bottom-Left) */}
      <div className="fixed bottom-6 left-6 z-[100] bg-slate-900/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col gap-2">
         <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 border-b border-white/5 pb-2">
            Showcase
         </div>
         
         {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setCurrentExample(item.id as ExampleType)}
              className={`p-3 rounded-xl transition-all flex items-center gap-3 w-40 ${currentExample === item.id ? 'bg-neon text-black shadow-neon' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
                {item.icon}
                <span className="text-xs font-bold">{item.label}</span>
            </button>
         ))}
      </div>

      {/* Render Active Example */}
      {renderExample()}
    </div>
  );
}

export default App;
