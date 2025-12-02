import { motion } from 'motion/react';
import { Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-3">
      {/* Status Badge */}
      <motion.div
        className="glass-card backdrop-blur-xl border rounded-full px-4 py-2 flex items-center gap-2"
        style={{
          borderColor: isConnected ? 'rgba(0, 255, 157, 0.3)' : 'rgba(255, 46, 46, 0.3)',
          background: isConnected
            ? 'linear-gradient(135deg, rgba(0, 255, 157, 0.1) 0%, rgba(0, 240, 255, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(255, 46, 46, 0.1) 0%, rgba(255, 46, 46, 0.05) 100%)',
        }}
        animate={{
          boxShadow: isConnected
            ? ['0 0 10px rgba(0, 255, 157, 0.2)', '0 0 20px rgba(0, 255, 157, 0.4)', '0 0 10px rgba(0, 255, 157, 0.2)']
            : '0 0 10px rgba(255, 46, 46, 0.2)',
        }}
        transition={{
          duration: 2,
          repeat: isConnected ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        {/* Icon with Animation */}
        <motion.div
          animate={{
            scale: isConnected ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: isConnected ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {isConnected ? (
            <Wifi className="w-4 h-4 text-[#00FF9D]" />
          ) : (
            <WifiOff className="w-4 h-4 text-[#FF2E2E]" />
          )}
        </motion.div>

        {/* Status Text */}
        <span
          className="text-sm tracking-wide"
          style={{
            color: isConnected ? '#00FF9D' : '#FF2E2E',
          }}
        >
          {isConnected ? t('connected') : t('offline')}
        </span>

        {/* Heartbeat Pulse Indicator */}
        {isConnected && (
          <motion.div
            className="w-2 h-2 rounded-full bg-[#00FF9D]"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              boxShadow: '0 0 10px #00FF9D',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}