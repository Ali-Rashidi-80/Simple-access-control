
import React from 'react';

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: 'primary' | 'ghost' | 'icon';
}

const LiquidButton: React.FC<LiquidButtonProps> = ({ 
  children, 
  active = false, 
  variant = 'primary',
  className = '',
  ...props 
}) => {
  const baseStyle = "relative overflow-hidden transition-all duration-300 ease-out font-medium focus:outline-none flex items-center justify-center";
  
  const variants = {
    primary: `rounded-xl text-sm px-4 py-2.5 ${active 
      ? "bg-neon/10 text-neon border border-neon/40 shadow-neon" 
      : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"}`,
    ghost: `rounded-xl text-sm px-4 py-2.5 ${active
      ? "text-neon bg-neon/10"
      : "text-slate-400 hover:text-neon hover:bg-neon/5"}`,
    icon: `rounded-full p-2 ${active
      ? "bg-neon/20 text-neon" 
      : "hover:bg-white/10 text-slate-300 hover:text-neon"}`
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2 w-full justify-center">
        {children}
      </span>
      {active && variant !== 'icon' && (
        <div className="absolute inset-0 bg-neon/10 blur-sm z-0" />
      )}
    </button>
  );
};

export default LiquidButton;
