import { motion } from 'motion/react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'fa' ? 'en' : 'fa');
  };

  return (
    <motion.button
      onClick={toggleLanguage}
      className="glass-card backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 hover:border-[#00F0FF]/30 transition-all duration-300"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        boxShadow: '0 4px 12px rgba(0, 240, 255, 0.1)',
      }}
    >
      <Languages className="w-4 h-4 text-[#00F0FF]" />
      <span className="text-white/80 text-sm tracking-wide">
        {language === 'fa' ? 'EN' : 'فا'}
      </span>
    </motion.button>
  );
}
