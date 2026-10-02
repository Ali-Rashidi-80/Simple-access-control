import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Check, Shield, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAppSettings } from '../../settings/contexts/AppSettingsContext';

interface LiquidUnlockButtonProps {
  onUnlock: (isDuressMode?: boolean) => void;
  externalTrigger?: boolean; // When true, shows visual animation WITHOUT sending command
  onExternalTriggerComplete?: () => void; // Called when external trigger animation completes
}

// Convert English numbers to Persian numbers
const toPersianNumber = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(digit => persianDigits[parseInt(digit)] || digit).join('');
};

export function LiquidUnlockButton({ onUnlock, externalTrigger, onExternalTriggerComplete }: LiquidUnlockButtonProps) {
  const { t, language } = useLanguage();
  const { isSecureMode, requireBiometric, isDuressMode, timerDuration } = useAppSettings();
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [countdown, setCountdown] = useState(timerDuration);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [showDuressWarning, setShowDuressWarning] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const progressTimer = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);

  // Handle external trigger (RFID scan) - visual only, no command sent
  useEffect(() => {
    if (externalTrigger && !isUnlocked && !isCountingDown) {
      // Trigger visual animation immediately (skip progress fill, go straight to unlocked)
      if (progressTimer.current) clearInterval(progressTimer.current);

      setProgress(100);
      setIsUnlocked(true);

      // Start countdown
      setIsCountingDown(true);
      setCountdown(timerDuration);

      countdownTimer.current = window.setInterval(() => {
        setCountdown((prev: number) => {
          if (prev <= 1) {
            if (countdownTimer.current) {
              clearInterval(countdownTimer.current);
            }
            setIsCountingDown(false);
            setIsUnlocked(false);
            setProgress(0);
            setIsPressed(false);
            onExternalTriggerComplete?.();
            return timerDuration;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [externalTrigger, isUnlocked, isCountingDown, timerDuration, onExternalTriggerComplete]);

  const handlePressStart = async () => {
    if (isUnlocked || isCountingDown) return;

    // Check if in secure mode
    if (isSecureMode) {
      alert(t('secureModeActive'));
      return;
    }

    // Biometric Authentication
    if (requireBiometric) {
      const bioAuth = await requestBiometricAuth();
      if (!bioAuth) {
        alert(t('biometricFailed'));
        return;
      }
    }

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

  const requestBiometricAuth = async (): Promise<boolean> => {
    // Simulate biometric authentication
    // In real app, would use Web Authentication API
    return new Promise((resolve) => {
      const userConfirm = confirm(t('biometricPrompt'));
      setTimeout(() => resolve(userConfirm), 500);
    });
  };

  const handleUnlock = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }

    setIsUnlocked(true);

    // Check for duress mode
    if (isDuressMode) {
      setShowDuressWarning(true);
      setTimeout(() => setShowDuressWarning(false), 3000);
    }

    // Only call onUnlock for MANUAL press (not external trigger)
    onUnlock(isDuressMode);

    // Start countdown with liquid drain effect
    setIsCountingDown(true);
    setCountdown(timerDuration);

    countdownTimer.current = window.setInterval(() => {
      setCountdown((prev: number) => {
        if (prev <= 1) {
          // Reset to locked state
          if (countdownTimer.current) {
            clearInterval(countdownTimer.current);
          }
          setIsCountingDown(false);
          setIsUnlocked(false);
          setProgress(0);
          setIsPressed(false);
          return timerDuration;
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
  const drainProgress = ((timerDuration - countdown) / timerDuration) * 100; // Liquid draining from 0 to 100

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Duress Mode Warning */}
      <AnimatePresence>
        {showDuressWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 glass-card backdrop-blur-xl border border-[var(--liquid-danger)]/30 rounded-2xl px-6 py-3 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 46, 46, 0.2) 0%, rgba(255, 46, 46, 0.05) 100%)',
              boxShadow: '0 0 30px rgba(255, 46, 46, 0.3)',
            }}
          >
            <AlertTriangle className="w-5 h-5 text-[var(--liquid-danger)]" />
            <span className="text-[var(--liquid-danger)] tracking-wide">{t('duressAlertSent')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative w-48 h-48 md:w-64 md:h-64"
        animate={{
          scale: isPressed ? 0.95 : 1,
        }}
        transition={{ duration: 0.15 }}
      >
        {/* Shockwave Effect on Unlock */}
        <AnimatePresence>
          {isUnlocked && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-[var(--liquid-success)]"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Rotating Cyberpunk Portal Ring */}
        <motion.div
          className="absolute inset-[-10px] rounded-full opacity-60 blur-md"
          style={{
            background: isSecureMode
              ? 'conic-gradient(from 0deg, transparent, var(--liquid-danger), transparent)'
              : isUnlocked
                ? 'conic-gradient(from 0deg, transparent, var(--liquid-success), transparent)'
                : 'conic-gradient(from 0deg, transparent, var(--liquid-primary), transparent, var(--liquid-primary), transparent)',
          }}
          animate={{
            rotate: 360,
            scale: isPressed ? 1.05 : 1,
            opacity: isPressed ? 0.8 : 0.6,
          }}
          transition={{
            rotate: { duration: 4, repeat: Infinity, ease: "linear" },
            scale: { duration: 0.2 },
            opacity: { duration: 0.2 },
          }}
        />

        {/* Outer Glow Ring (Static Base) */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: isSecureMode
              ? 'radial-gradient(circle, rgba(255, 46, 46, 0.2) 0%, transparent 70%)'
              : isUnlocked
                ? 'radial-gradient(circle, rgba(0, 255, 157, 0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, var(--liquid-glass-shadow) 0%, transparent 70%)',
          }}
        />

        {/* Main Button */}
        <motion.button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          className="relative w-full h-full rounded-full glass-card backdrop-blur-xl border-2 overflow-hidden cursor-pointer active:cursor-grabbing z-10"
          style={{
            borderColor: isSecureMode ? 'var(--liquid-danger)' : isUnlocked ? 'var(--liquid-success)' : 'var(--liquid-primary)',
            boxShadow: isSecureMode
              ? '0 0 40px rgba(255, 46, 46, 0.5), inset 0 0 20px rgba(255, 46, 46, 0.1)'
              : isUnlocked
                ? '0 0 40px rgba(0, 255, 157, 0.5), inset 0 0 20px rgba(0, 255, 157, 0.1)'
                : '0 0 30px var(--liquid-glass-shadow), inset 0 0 20px var(--liquid-glass-shadow)',
          }}
          animate={{
            scale: isUnlocked ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 0.6 }}
        >
          {/* Liquid Fill Effect (Filling up when pressing) */}
          {!isCountingDown && (
            <motion.div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{
                background: isUnlocked
                  ? 'linear-gradient(180deg, var(--liquid-success) 0%, var(--liquid-primary) 100%)'
                  : 'linear-gradient(180deg, var(--liquid-primary) 0%, var(--liquid-secondary) 100%)',
                transformOrigin: 'bottom',
              }}
              initial={{ scaleY: 0 }}
              animate={{
                scaleY: progress / 100,
                filter: isPressed ? 'brightness(1.2)' : 'brightness(1)', // Dynamic brightness
              }}
              transition={{ duration: 0.1, ease: 'linear' }}
            >
              {/* Secondary Wave Layer (Parallax) - Optimized */}
              <motion.div
                className="absolute inset-x-0 -top-4 h-8 bg-white/20 blur-sm"
                animate={{
                  x: [-50, 50],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                }}
              />

              {/* Dynamic Gradient Overlay (Simulates movement without particles) */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent"
                animate={{
                  y: ['100%', '-100%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </motion.div>
          )}

          {/* Liquid Drain Effect (Emptying during countdown) */}
          {isCountingDown && (
            <>
              {/* Water Level */}
              <motion.div
                className="absolute inset-0 rounded-full overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, var(--liquid-success) 0%, var(--liquid-primary) 100%)',
                  transformOrigin: 'bottom',
                }}
                animate={{
                  scaleY: 1 - (drainProgress / 100),
                }}
                transition={{ duration: 0.3, ease: 'linear' }}
              >
                {/* Animated Water Surface */}
                <motion.div
                  className="absolute inset-x-0 top-0 h-10"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
                  }}
                  animate={{
                    x: [-100, 100],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                {/* Enhanced Water Ripples (Multi-Layer) - Optimized SVG */}
                <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none">
                  <motion.path
                    d="M0,10 Q50,0 100,10 T200,10 V100 H0 Z"
                    fill="white"
                    animate={{
                      d: [
                        "M0,10 Q50,0 100,10 T200,10 V100 H0 Z",
                        "M0,10 Q50,25 100,10 T200,10 V100 H0 Z",
                        "M0,10 Q50,0 100,10 T200,10 V100 H0 Z",
                      ],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                </svg>
              </motion.div>

              {/* Glass Bottom Highlight */}
              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white/20 to-transparent rounded-b-full pointer-events-none" />
            </>
          )}

          {/* Glare Effect - Enhanced for "Glass" feel without droplets */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/50 via-transparent to-transparent opacity-60 pointer-events-none" />

          {/* Icon or Countdown */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <AnimatePresence mode="wait">
              {isSecureMode && !isPressed && !isUnlocked ? (
                <motion.div
                  key="secure"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.4, ease: 'backOut' }}
                >
                  <Shield className="w-16 h-16 md:w-20 md:h-20 text-[var(--liquid-danger)]" strokeWidth={2.5} />
                </motion.div>
              ) : isCountingDown ? (
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
                      scale: [1, 1.15, 1],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <span
                      className="block text-6xl md:text-7xl tracking-wider font-bold force-text-black"
                      style={{
                        color: '#000000',
                        textShadow: 'none',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {displayCountdown}
                    </span>
                  </motion.div>
                  <span
                    className="text-sm tracking-wide opacity-80 font-bold force-text-black"
                    style={{
                      color: '#000000',
                      textShadow: 'none',
                    }}
                  >
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
                    // Shake effect when pressed
                    x: isPressed ? [-1, 1, -1, 1, 0] : 0,
                  }}
                  exit={{ scale: 0, rotate: -180 }}
                  transition={{
                    duration: 0.4,
                    ease: 'backOut',
                    y: { duration: 0.3, repeat: isPressed ? Infinity : 0 },
                    x: { duration: 0.2, repeat: isPressed ? Infinity : 0 },
                  }}
                >
                  <Lock
                    className="w-16 h-16 md:w-20 md:h-20"
                    strokeWidth={2.5}
                    style={{
                      color: progress > 50 ? '#050505' : 'var(--liquid-primary)',
                      // Glow effect on icon
                      filter: isPressed ? 'drop-shadow(0 0 8px var(--liquid-primary))' : 'none',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Ring - Enhanced Neon Glow */}
          {!isUnlocked && !isCountingDown && !isSecureMode && progress > 0 && (
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="var(--liquid-primary)"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
                className="transition-all duration-100"
                style={{
                  filter: 'drop-shadow(0 0 15px var(--liquid-primary))', // Stronger neon glow
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
        {isSecureMode ? (
          <p className="text-[var(--liquid-danger)] text-sm tracking-wide">{t('secureModeActive')}</p>
        ) : (
          <>
            <p className="text-white/60 text-sm tracking-wide">
              {isPressed ? t('holdToUnlock') : t('pressAndHold')}
            </p>
            {isPressed && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[var(--liquid-primary)] text-xs mt-2"
              >
                {language === 'fa' ? `٪${toPersianNumber(Math.floor(progress))}` : `${Math.floor(progress)}%`}
              </motion.p>
            )}
          </>
        )}
      </motion.div>

      {/* Countdown Message */}
      {
        isCountingDown && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <p
              className="text-sm tracking-wide"
              style={{
                color: drainProgress > 80 ? 'var(--liquid-danger)' : drainProgress > 50 ? 'var(--liquid-warning)' : 'var(--liquid-success)',
              }}
            >
              {t('lockingIn')} {displayCountdown} {t('seconds')}
            </p>
          </motion.div>
        )
      }
    </div >
  );
}
