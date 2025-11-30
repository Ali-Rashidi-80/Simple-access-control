import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LiquidUnlockButtonProps {
  onUnlock: () => void;
}

// Convert English numbers to Persian numbers
const toPersianNumber = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(digit => persianDigits[parseInt(digit)] || digit).join('');
};

export function LiquidUnlockButton({ onUnlock }: LiquidUnlockButtonProps) {
  const { t, language } = useLanguage();
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const progressTimer = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);

  const handlePressStart = () => {
    if (isUnlocked || isCountingDown) return;
    
    setIsPressed(true);
    const startTime = Date.now();
    
    progressTimer.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / 2000) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        handleUnlock();
      }
    }, 16);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    
    // Reset progress if not completed
    if (progress < 100) {
      setProgress(0);
    }
  };

  const handleUnlock = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }
    
    setIsUnlocked(true);
    onUnlock();
    
    // Start 5-second countdown
    setIsCountingDown(true);
    setCountdown(5);
    
    countdownTimer.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Reset to locked state
          if (countdownTimer.current) {
            clearInterval(countdownTimer.current);
          }
          setIsCountingDown(false);
          setIsUnlocked(false);
          setProgress(0);
          setIsPressed(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  const displayCountdown = language === 'fa' ? toPersianNumber(countdown) : countdown.toString();

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        className="relative w-48 h-48 md:w-64 md:h-64"
        animate={{
          scale: isPressed ? 0.95 : 1,
        }}
        transition={{ duration: 0.15 }}
      >
        {/* Outer Glow Ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: isUnlocked
              ? 'radial-gradient(circle, rgba(0, 255, 157, 0.3) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(0, 240, 255, 0.2) 0%, transparent 70%)',
          }}
          animate={{
            scale: isUnlocked ? [1, 1.2, 1] : isPressed ? 1 : [1, 1.1, 1],
          }}
          transition={{
            duration: isUnlocked ? 0.6 : 2,
            repeat: isUnlocked ? 0 : Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Main Button */}
        <motion.button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          className="relative w-full h-full rounded-full glass-card backdrop-blur-xl border-2 overflow-hidden cursor-pointer active:cursor-grabbing"
          style={{
            borderColor: isUnlocked ? '#00FF9D' : '#00F0FF',
            boxShadow: isUnlocked
              ? '0 0 40px rgba(0, 255, 157, 0.5), inset 0 0 20px rgba(0, 255, 157, 0.1)'
              : '0 0 30px rgba(0, 240, 255, 0.3), inset 0 0 20px rgba(0, 240, 255, 0.05)',
          }}
          animate={{
            scale: isUnlocked ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 0.6 }}
        >
          {/* Liquid Fill Effect */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: isUnlocked
                ? 'linear-gradient(180deg, #00FF9D 0%, #00F0FF 100%)'
                : 'linear-gradient(180deg, #00F0FF 0%, #a855f7 100%)',
              transformOrigin: 'bottom',
            }}
            initial={{ scaleY: 0 }}
            animate={{
              scaleY: progress / 100,
            }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />

          {/* Glare Effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50" />

          {/* Icon or Countdown */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <AnimatePresence mode="wait">
              {isCountingDown ? (
                <motion.div
                  key="countdown"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <motion.div
                    className="relative"
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <span 
                      className="block text-6xl md:text-7xl tracking-wider"
                      style={{
                        color: '#050505',
                        textShadow: '0 0 20px rgba(0, 255, 157, 0.8)',
                      }}
                    >
                      {displayCountdown}
                    </span>
                  </motion.div>
                  <span className="text-[#050505] text-sm tracking-wide opacity-80">
                    {t('seconds')}
                  </span>
                </motion.div>
              ) : isUnlocked ? (
                <motion.div
                  key="unlocked"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.4, ease: 'backOut' }}
                >
                  <Check className="w-16 h-16 md:w-20 md:h-20 text-[#050505]" strokeWidth={3} />
                </motion.div>
              ) : (
                <motion.div
                  key="locked"
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{
                    scale: 1,
                    rotate: 0,
                    y: isPressed ? [0, -2, 0] : 0,
                  }}
                  exit={{ scale: 0, rotate: -180 }}
                  transition={{
                    duration: 0.4,
                    ease: 'backOut',
                    y: { duration: 0.3, repeat: isPressed ? Infinity : 0 },
                  }}
                >
                  <Lock
                    className="w-16 h-16 md:w-20 md:h-20"
                    strokeWidth={2.5}
                    style={{
                      color: progress > 50 ? '#050505' : '#00F0FF',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Ring */}
          {!isUnlocked && !isCountingDown && progress > 0 && (
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="#00F0FF"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
                className="transition-all duration-100"
                style={{
                  filter: 'drop-shadow(0 0 10px #00F0FF)',
                }}
              />
            </svg>
          )}
        </motion.button>
      </motion.div>

      {/* Instruction Text */}
      <motion.div
        className="text-center"
        animate={{
          opacity: isUnlocked || isCountingDown ? 0 : 1,
        }}
      >
        <p className="text-white/60 text-sm tracking-wide">
          {isPressed ? t('holdToUnlock') : t('pressAndHold')}
        </p>
        {isPressed && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#00F0FF] text-xs mt-2"
          >
            {language === 'fa' ? `٪${toPersianNumber(Math.floor(progress))}` : `${Math.floor(progress)}%`}
          </motion.p>
        )}
      </motion.div>

      {/* Countdown Message */}
      {isCountingDown && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center"
        >
          <p className="text-[#00FF9D] text-sm tracking-wide">
            {t('lockingIn')} {displayCountdown} {t('seconds')}
          </p>
        </motion.div>
      )}
    </div>
  );
}
