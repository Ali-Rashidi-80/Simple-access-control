import { motion } from 'motion/react';
import { Monitor, Terminal } from 'lucide-react';
import { useAppSettings, Theme } from '../contexts/AppSettingsContext';
import { useLanguage } from '../../../contexts/LanguageContext';

export function ThemeSwitcher() {
    const { theme, setTheme } = useAppSettings();
    const { t } = useLanguage();

    const themes: { id: Theme; icon: React.ReactNode; labelKey: string }[] = [
        { id: 'neon', icon: <Monitor className="w-4 h-4" />, labelKey: 'theme_neon' },
        { id: 'matrix', icon: <Terminal className="w-4 h-4" />, labelKey: 'theme_matrix' },
    ];

    const cycleTheme = () => {
        const currentIndex = themes.findIndex(t => t.id === theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex].id);
    };

    const currentTheme = themes.find(t => t.id === theme) || themes[0];

    return (
        <motion.button
            onClick={cycleTheme}
            className="glass-card backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 hover:border-[#00F0FF]/30 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
                boxShadow: '0 4px 12px rgba(0, 240, 255, 0.1)',
            }}
        >
            <div className={`text-[#00F0FF] ${theme === 'matrix' ? 'text-[#00FF00]' : ''}`}>
                {currentTheme.icon}
            </div>
            <span className={`text-white/80 text-sm tracking-wide ${theme === 'matrix' ? 'font-mono text-[#00FF00]/80' : ''}`}>
                {t(currentTheme.labelKey)}
            </span>
        </motion.button>
    );
}
