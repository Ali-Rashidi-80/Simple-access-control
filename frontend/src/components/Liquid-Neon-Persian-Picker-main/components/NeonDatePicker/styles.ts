
import { Variants } from 'framer-motion';

export const styles = {
  // Modal & Trigger
  overlay: "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all pointer-events-auto",
  
  // Smart Trigger Button
  triggerButton: "group flex items-center bg-glass-bg border border-white/10 h-16 rounded-2xl hover:border-neon hover:bg-slate-800/80 transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.3)] relative overflow-hidden backdrop-blur-xl z-50",
  
  triggerIcon: "text-neon group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all",
  triggerReset: "hidden", 

  // Content inside the expandable trigger
  triggerContent: "whitespace-nowrap overflow-hidden flex flex-col justify-center relative",
  
  // Containers
  glassContainer: "relative overflow-hidden bg-glass-bg backdrop-blur-2xl border border-glass-border shadow-2xl flex flex-col md:flex-row max-h-[90vh]",
  sidebar: "bg-slate-900/40 border-glass-border backdrop-blur-md overflow-y-auto relative z-10",
  
  // Header & Typography
  headerTitle: "text-xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] cursor-pointer hover:text-neon transition-colors select-none tracking-tight",
  
  // Grid
  gridDay: "relative flex items-center justify-center rounded-xl text-sm transition-all duration-300 select-none z-10",
  // Removed scale-105 to prevent clipping/overflow issues
  dayStartEnd: "bg-neon text-black font-bold shadow-neon z-20", 
  dayMiddle: "bg-neon/10 text-neon font-medium z-0 first:rounded-r-xl last:rounded-l-xl", 
  dayDisabled: "text-slate-700 opacity-30 cursor-default scale-95 grayscale",
  dayDefault: "text-slate-300 hover:bg-white/10 hover:text-white hover:border hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]",
  
  // Scrollbars & Utilities
  scrollBar: "scrollbar-thin scrollbar-thumb-neon/20 scrollbar-track-transparent hover:scrollbar-thumb-neon/40",
  
  // Month/Year Selector
  monthButton: "rounded-xl font-bold border border-white/5 hover:border-neon/50 hover:bg-neon/10 hover:text-neon transition-all duration-300 flex items-center justify-center w-full relative overflow-hidden",
  monthButtonActive: "bg-neon text-black shadow-neon border-transparent scale-[1.02]",

  // Action Footer
  actionFooter: "border-t border-white/10 p-4 flex items-center justify-between bg-slate-900/60 backdrop-blur-md relative z-20",
  confirmBtn: "bg-neon text-black font-bold px-6 py-2 rounded-xl shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] hover:bg-[#33f2ff] transition-all text-sm active:scale-95",
  cancelBtn: "text-slate-400 hover:text-white px-4 py-2 transition-colors text-sm font-medium hover:bg-white/5 rounded-lg active:scale-95",
  resetBtn: "text-rose-500 hover:text-rose-400 px-3 py-2 transition-colors text-xs font-medium hover:bg-rose-500/10 rounded-lg active:scale-95 flex items-center gap-2 cursor-pointer",
};

export const animations: {
  overlay: Variants;
  container: Variants;
  day: Variants;
  slide: Variants;
} = {
  overlay: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  },
  container: {
    hidden: { opacity: 0, scale: 0.8, y: 50, rotateX: 10, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      rotateX: 0,
      filter: 'blur(0px)',
      transition: { 
        type: "spring", 
        stiffness: 200, 
        damping: 20,
        mass: 0.8,
        staggerChildren: 0.1 
      }
    },
    exit: { opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)', transition: { duration: 0.2 } }
  },
  day: {
    hover: { scale: 1.15, zIndex: 30, transition: { type: 'spring', stiffness: 400 } },
    tap: { scale: 0.9 }
  },
  slide: {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  }
};
