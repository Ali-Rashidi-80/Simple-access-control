import { motion } from 'motion/react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAppSettings } from '../contexts/AppSettingsContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const { theme } = useAppSettings();

  const toggleLanguage = () => {
    setLanguage(language === 'fa' ? 'en' : 'fa');
  };

  return (
    <motion.button
      type="button"
      onClick={toggleLanguage}
      className={`glass-card backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 transition-all duration-300 cursor-pointer ${
        theme === 'matrix'
          ? 'hover:border-[#00FF66]/50 text-emerald-200/90'
          : 'hover:border-[#00F0FF]/30 text-white/80'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        boxShadow: theme === 'matrix' ? '0 4px 12px rgba(0, 255, 102, 0.15)' : '0 4px 12px rgba(0, 240, 255, 0.1)',
      }}
      title={language === 'fa' ? 'تغییر زبان سیستم' : 'Switch System Language'}
    >
      <Languages className={`w-4 h-4 transition-colors ${theme === 'matrix' ? 'text-[#00FF66]' : 'text-[#00F0FF]'}`} />
      <span className="text-sm font-medium tracking-wide">
        {language === 'fa' ? 'EN' : 'فا'}
      </span>
    </motion.button>
  );
}
