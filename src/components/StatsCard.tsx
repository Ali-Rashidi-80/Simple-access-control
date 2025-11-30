import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'normal';
  trend: 'up' | 'down' | 'stable';
}

export function StatsCard({ icon, label, value, status, trend }: StatsCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return '#00FF9D';
      case 'warning':
        return '#FFB800';
      case 'normal':
        return '#00F0FF';
      default:
        return '#00F0FF';
    }
  };

  const statusColor = getStatusColor();

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      case 'stable':
        return <Minus className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      className="glass-card backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all duration-300"
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Glare Effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Animated Background Gradient */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${statusColor}20 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="p-3 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: `${statusColor}15`,
              boxShadow: `0 0 20px ${statusColor}20`,
            }}
          >
            <div style={{ color: statusColor }}>{icon}</div>
          </div>

          {/* Trend Indicator */}
          <motion.div
            className="flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
            whileHover={{ scale: 1.1 }}
          >
            <div className="text-white/60">{getTrendIcon()}</div>
          </motion.div>
        </div>

        {/* Label */}
        <p className="text-white/50 text-sm mb-2 tracking-wide">{label}</p>

        {/* Value */}
        <motion.div
          className="flex items-baseline gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span
            className="tracking-tight"
            style={{
              color: statusColor,
              textShadow: `0 0 20px ${statusColor}60`,
            }}
          >
            {value}
          </span>
        </motion.div>

        {/* Status Indicator Bar */}
        <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: statusColor,
              boxShadow: `0 0 10px ${statusColor}`,
            }}
            initial={{ width: '0%' }}
            animate={{ width: status === 'good' ? '100%' : status === 'warning' ? '70%' : '85%' }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
      </div>

      {/* Corner Accent */}
      <div
        className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-20 blur-2xl"
        style={{
          backgroundColor: statusColor,
        }}
      />
    </motion.div>
  );
}
