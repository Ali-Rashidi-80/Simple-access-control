import { useState } from 'react';
import { motion } from 'motion/react';
import { useAppSettings } from '../contexts/AppSettingsContext';

export function HackerModeToggle() {
  const [clickCount, setClickCount] = useState(0);
  const { isHackerMode, setIsHackerMode } = useAppSettings();

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 5) {
      setIsHackerMode(!isHackerMode);
      setClickCount(0);
      
      // Show easter egg notification
      const message = !isHackerMode ? 'HACKER MODE ACTIVATED' : 'NORMAL MODE RESTORED';
      console.log(`%c ${message} `, 'background: #00FF00; color: #000; font-size: 20px; padding: 10px;');
    }

    // Reset counter after 2 seconds of inactivity
    setTimeout(() => setClickCount(0), 2000);
  };

  return (
    <motion.div
      onClick={handleLogoClick}
      className="cursor-pointer select-none"
      animate={{
        scale: clickCount > 0 ? [1, 1.1, 1] : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF] to-[#00FF9D] flex items-center justify-center relative overflow-hidden">
        {isHackerMode && (
          <motion.div
            className="absolute inset-0 bg-[#00FF00]"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          />
        )}
        <div className="w-5 h-5 border-2 border-[#050505] rounded-md relative z-10" />
      </div>
      
      {/* Click indicator */}
      {clickCount > 0 && clickCount < 5 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-[#00F0FF] rounded-full flex items-center justify-center text-[#050505] text-xs"
        >
          {clickCount}
        </motion.div>
      )}
    </motion.div>
  );
}
