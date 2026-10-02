import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Fingerprint, Clock, Terminal, ChevronUp, ChevronDown, AlertOctagon } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAppSettings } from '../contexts/AppSettingsContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';

export function SettingsPanel() {
  const { t } = useLanguage();
  const {
    requireBiometric,
    isDuressMode,
    isSecureMode,
    autoLockStart,
    autoLockEnd,
    theme,
    timerDuration,
    defaultLanguage,
    setRequireBiometric,
    setIsDuressMode,
    setAutoLockTimes,
    setTheme,
    setTimerDuration,
    setDefaultLanguage,
  } = useAppSettings();

  const toggleSwitch = (value: boolean, setter: (value: boolean) => void) => {
    setter(!value);
  };

  return (
    <div className="space-y-6 pt-8 md:pt-0">
      <h2 className="text-[#00F0FF] tracking-wide">{t('systemSettings')}</h2>

      {/* Secure Mode Status */}
      {isSecureMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-2xl backdrop-blur-xl border border-[#FF2E2E]/30"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 46, 46, 0.15) 0%, rgba(255, 46, 46, 0.05) 100%)',
            boxShadow: '0 0 20px rgba(255, 46, 46, 0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#FF2E2E]" />
            <div>
              <p className="text-[#FF2E2E]">{t('secureModeActive')}</p>
              <p className="text-white/50 text-sm mt-1">
                {t('secureModeDesc')} ({autoLockStart}:00 - {autoLockEnd}:00)
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Settings Cards */}
      <div className="space-y-4">
        {/* Auto-Lock Schedule with Time Picker */}
        <div
          className="glass-card p-6 rounded-2xl backdrop-blur-xl border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.03) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#00F0FF]" />
              </div>
              <div>
                <p className="text-white/90">{t('autoLockTimeout')}</p>
                <p className="text-white/40 text-sm">{t('autoLockDesc')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-white/60 text-sm mb-2 block">{t('startTime')}</label>
              <TimePickerField
                value={autoLockStart}
                onChange={(v) => setAutoLockTimes(v, autoLockEnd)}
              />
            </div>
            <div className="flex-1">
              <label className="text-white/60 text-sm mb-2 block">{t('endTime')}</label>
              <TimePickerField
                value={autoLockEnd}
                onChange={(v) => setAutoLockTimes(autoLockStart, v)}
              />
            </div>
          </div>
        </div>

        {/* Biometric Authentication */}
        <motion.div
          className="glass-card p-6 rounded-2xl backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
          onClick={() => toggleSwitch(requireBiometric, setRequireBiometric)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00FF9D]/10 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-[#00FF9D]" />
              </div>
              <div>
                <p className="text-white/90">{t('biometricAuth')}</p>
                <p className="text-white/40 text-sm">{t('biometricDesc')}</p>
              </div>
            </div>
            <ToggleSwitch isOn={requireBiometric} color="#00FF9D" />
          </div>
        </motion.div>

        {/* Duress Mode (Panic Finger) */}
        <motion.div
          className="glass-card p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 cursor-pointer"
          style={{
            borderColor: isDuressMode ? 'rgba(255, 46, 46, 0.3)' : 'rgba(255, 255, 255, 0.1)',
            background: isDuressMode
              ? 'linear-gradient(135deg, rgba(255, 46, 46, 0.1) 0%, rgba(255, 46, 46, 0.02) 100%)'
              : undefined,
          }}
          onClick={() => toggleSwitch(isDuressMode, setIsDuressMode)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: isDuressMode ? 'rgba(255, 46, 46, 0.2)' : 'rgba(255, 184, 0, 0.1)',
                }}
              >
                <AlertOctagon className="w-5 h-5" style={{ color: isDuressMode ? '#FF2E2E' : '#FFB800' }} />
              </div>
              <div>
                <p className="text-white/90">{t('duressMode')}</p>
                <p className="text-white/40 text-sm">{t('duressDesc')}</p>
              </div>
            </div>
            <ToggleSwitch isOn={isDuressMode} color="#FF2E2E" />
          </div>

          {isDuressMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <p className="text-[#FF2E2E] text-sm flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" />
                {t('duressWarning')}
              </p>
            </motion.div>
          )}
        </motion.div>


        <div className="glass-card p-6 rounded-2xl backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-[#00F0FF]" />
            </div>
            <div>
              <p className="text-white/90">{t('defaultConfiguration')}</p>
              <p className="text-white/40 text-sm">{t('defaultConfigDesc')}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Default Theme */}
            <div>
              <label className="text-white/60 text-sm mb-2 block">{t('defaultTheme')}</label>
              <Select value={theme} onValueChange={(v: string) => setTheme(v as any)}>
                <SelectTrigger className="w-full glass-card backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2 text-white bg-transparent focus:ring-[#00F0FF]/50 outline-none">
                  <SelectValue placeholder={t('selectTheme')} />
                </SelectTrigger>
                <SelectContent className="bg-[#050505]/90 backdrop-blur-xl border border-white/10 text-white">
                  {['neon', 'matrix', 'light'].map((tOption) => (
                    <SelectItem key={tOption} value={tOption} className="focus:bg-[#00F0FF]/20 focus:text-[#00F0FF] cursor-pointer">
                      {t('theme_' + tOption)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Default Language */}
            <div>
              <label className="text-white/60 text-sm mb-2 block">{t('defaultLanguage')}</label>
              <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                <SelectTrigger className="w-full glass-card backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2 text-white bg-transparent focus:ring-[#00F0FF]/50 outline-none">
                  <SelectValue placeholder={t('selectLanguage')} />
                </SelectTrigger>
                <SelectContent className="bg-[#050505]/90 backdrop-blur-xl border border-white/10 text-white">
                  <SelectItem value="fa" className="focus:bg-[#00F0FF]/20 focus:text-[#00F0FF] cursor-pointer">فارسی</SelectItem>
                  <SelectItem value="en" className="focus:bg-[#00F0FF]/20 focus:text-[#00F0FF] cursor-pointer">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timer Duration */}
            <div>
              <label className="text-white/60 text-sm mb-2 block">{t('timerDuration')} ({timerDuration}s)</label>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={timerDuration}
                onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                className="w-full accent-[#00F0FF] h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>3s</span>
                <span>15s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Spacer - Smart spacing for navigation */}
      <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
    </div>
  );
}



interface ToggleSwitchProps {
  isOn: boolean;
  color: string;
}

function ToggleSwitch({ isOn, color }: ToggleSwitchProps) {
  const { isRTL } = useLanguage();

  return (
    <motion.div
      className="relative w-14 h-8 rounded-full flex items-center cursor-pointer overflow-hidden"
      style={{
        backgroundColor: isOn ? `${color}30` : 'rgba(100, 100, 100, 0.3)',
        border: `2px solid ${isOn ? color : 'rgba(150, 150, 150, 0.4)'}`,
        boxShadow: isOn ? `0 0 20px ${color}40` : 'inset 0 2px 4px rgba(0,0,0,0.3)',
      }}
      animate={{
        backgroundColor: isOn ? `${color}30` : 'rgba(100, 100, 100, 0.3)',
        borderColor: isOn ? color : 'rgba(150, 150, 150, 0.4)',
      }}
      transition={{ duration: 0.25 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Background Labels */}
      <span
        className="absolute text-[9px] font-bold transition-opacity duration-200"
        style={{
          [isRTL ? 'right' : 'left']: '5px',
          opacity: isOn ? 1 : 0,
          color: color
        }}
      >
        ON
      </span>
      <span
        className="absolute text-[9px] font-bold transition-opacity duration-200"
        style={{
          [isRTL ? 'left' : 'right']: '4px',
          opacity: isOn ? 0 : 1,
          color: 'rgba(180, 180, 180, 0.8)'
        }}
      >
        OFF
      </span>

      {/* Knob */}
      <motion.div
        className="w-6 h-6 rounded-full absolute"
        style={{
          backgroundColor: isOn ? color : 'rgba(180, 180, 180, 0.9)',
          boxShadow: isOn
            ? `0 0 12px ${color}, 0 2px 6px rgba(0,0,0,0.3)`
            : '0 2px 6px rgba(0, 0, 0, 0.4)',
          [isRTL ? 'right' : 'left']: '1px'
        }}
        animate={{
          x: isOn ? (isRTL ? -22 : 22) : 0,
          backgroundColor: isOn ? color : 'rgba(180, 180, 180, 0.9)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {isOn && (
          <motion.div
            className="absolute inset-1 rounded-full bg-white/40"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

// Time Picker Field Component
function TimePickerField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:00 ${period}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full glass-card backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 text-white bg-transparent hover:border-[#00F0FF]/50 transition-colors outline-none flex items-center justify-between group"
        >
          <span className="text-lg font-medium">{formatHour(value)}</span>
          <Clock className="w-4 h-4 text-white/40 group-hover:text-[#00F0FF] transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-4 bg-[#0a0a14]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
        align="center"
      >
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => onChange(value < 23 ? value + 1 : 0)}
            className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-[#00F0FF] transition-colors"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <div className="text-3xl font-bold text-[#00F0FF] py-2">
            {formatHour(value)}
          </div>
          <button
            onClick={() => onChange(value > 0 ? value - 1 : 23)}
            className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-[#00F0FF] transition-colors"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
          <div className="grid grid-cols-4 gap-1 mt-2 w-full">
            {[0, 6, 12, 18].map((h) => (
              <button
                key={h}
                onClick={() => { onChange(h); setIsOpen(false); }}
                className={`py-1 px-2 rounded-lg text-xs font-medium transition-colors ${value === h ? 'bg-[#00F0FF] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
              >
                {formatHour(h).split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
