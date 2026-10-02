import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAppSettings } from '../../settings/contexts/AppSettingsContext';
import { LanguageSwitcher } from '../../settings/components/LanguageSwitcher';
import { ThemeSwitcher } from '../../settings/components/ThemeSwitcher';
import { OTPInput } from './OTPInput';
import {
    X, Mail, Lock, User, Phone, Key, ArrowLeft, ArrowRight,
    Shield, Clock, CheckCircle, AlertCircle, Loader, Eye, EyeOff, Film
} from 'lucide-react';
import './LoginPanel.css';

/**
 * Bulletproof, flicker-free typewriter hook with deterministic timer lifecycle
 */
function useTypewriter(words: string[], typingSpeed = 75, deletingSpeed = 35, pauseDelay = 2400) {
    const [text, setText] = useState('');
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setText('');
        setWordIndex(0);
        setIsDeleting(false);
    }, [words]);

    useEffect(() => {
        if (!words || words.length === 0) return;
        const currentWord = words[wordIndex % words.length];

        let timeoutId: any;

        if (!isDeleting) {
            if (text.length < currentWord.length) {
                timeoutId = setTimeout(() => {
                    setText(currentWord.slice(0, text.length + 1));
                }, typingSpeed);
            } else {
                timeoutId = setTimeout(() => {
                    setIsDeleting(true);
                }, pauseDelay);
            }
        } else {
            if (text.length > 0) {
                timeoutId = setTimeout(() => {
                    setText(currentWord.slice(0, text.length - 1));
                }, deletingSpeed);
            } else {
                setIsDeleting(false);
                setWordIndex(prev => (prev + 1) % words.length);
            }
        }

        return () => clearTimeout(timeoutId);
    }, [text, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseDelay]);

    return text;
}

type LoginMode = 'login' | 'otp' | '2fa' | 'recovery' | 'register';

interface LoginPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginPanel({ isOpen, onClose }: LoginPanelProps) {
    const { t, isRTL, language } = useLanguage();
    const { theme } = useAppSettings();
    const { login, loginWithOTP, loginWith2FA, loginWithGoogle, requestOTP, verifyOTP, requestPasswordReset, resetPassword } = useAuth();

    // State
    const [mode, setMode] = useState<LoginMode>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Form fields
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [twoFACode, setTwoFACode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [currentBg, setCurrentBg] = useState<'login-bg' | 'b'>('login-bg');

    // Auto-select Video 2 ('b') on Matrix theme activation, and Video 1 ('login-bg') on Neon theme
    useEffect(() => {
        if (theme === 'matrix') {
            setCurrentBg('b');
        } else {
            setCurrentBg('login-bg');
        }
    }, [theme]);

    // Memoized words for smooth typing
    const titles = useMemo(() => language === 'en' ? [
        'ACCESS CONTROL SYSTEM',
        'SECURE AUTHENTICATION',
        'GATE MANAGEMENT'
    ] : [
        'سامانه کنترل تردد',
        'ورود امن به سامانه',
        'مدیریت گیت‌های تردد'
    ], [language]);

    const subtitles = useMemo(() => language === 'en' ? [
        'Intelligent Access Control and Telemetry System',
        'Real-time Access Event Monitoring and Audit',
        'Unified Hardware Gate Management'
    ] : [
        'سیستم هوشمند کنترل تردد و تله‌متری',
        'پایش و ثبت بلادرنگ رویدادهای ورود و خروج',
        'مدیریت یکپارچه دسترسی و گیت‌های سخت‌افزاری'
    ], [language]);

    const displayedTitle = useTypewriter(titles, 75, 35, 2400);
    const displayedSubtitle = useTypewriter(subtitles, 50, 25, 3200);

    const toggleBackground = () => {
        setCurrentBg(prev => prev === 'login-bg' ? 'b' : 'login-bg');
    };

    // OTP Timer
    const [otpTimer, setOtpTimer] = useState(0);
    const [canResendOTP, setCanResendOTP] = useState(true);

    // Reset form when mode changes
    useEffect(() => {
        setError('');
        setSuccess('');
        setOtpCode('');
        setTwoFACode('');
    }, [mode]);

    // OTP countdown timer
    useEffect(() => {
        if (otpTimer > 0) {
            const interval = setInterval(() => {
                setOtpTimer(prev => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setCanResendOTP(true);
        }
    }, [otpTimer]);

    // Handle login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(username, password);
            if (result) {
                setSuccess(t('loginSuccess') || 'ورود موفقیت‌آمیز!');
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError(t('invalidCredentials') || 'نام کاربری یا رمز عبور اشتباه است');
            }
        } catch (err) {
            setError(t('loginError') || 'خطا در ورود به سیستم');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP request
    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await requestOTP(phone);
            if (result) {
                setSuccess(t('otpSent') || 'کد یکبار مصرف ارسال شد');
                setOtpTimer(300); // 5 minutes
                setCanResendOTP(false);
            } else {
                setError(t('otpError') || 'خطا در ارسال کد');
            }
        } catch (err) {
            setError(t('otpError') || 'خطا در ارسال کد');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP verification
    const handleVerifyOTP = async () => {
        if (otpCode.length !== 6) {
            setError(t('invalidOTP') || 'کد وارد شده نامعتبر است');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const result = await loginWithOTP(phone, otpCode);
            if (result) {
                setSuccess(t('loginSuccess') || 'ورود موفقیت‌آمیز!');
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError(t('invalidOTP') || 'کد وارد شده نامعتبر است');
                setOtpCode('');
            }
        } catch (err) {
            setError(t('otpVerifyError') || 'خطا در تأیید کد');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle 2FA
    const handle2FA = async () => {
        if (twoFACode.length !== 6) {
            setError(t('invalid2FA') || 'کد تأیید نامعتبر است');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const result = await loginWith2FA(username, password, twoFACode);
            if (result) {
                setSuccess(t('loginSuccess') || 'ورود موفقیت‌آمیز!');
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError(t('invalid2FA') || 'کد تأیید نامعتبر است');
                setTwoFACode('');
            }
        } catch (err) {
            setError(t('2faError') || 'خطا در تأیید دو مرحله‌ای');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle password recovery
    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setError(t('passwordMismatch') || 'رمز عبور و تأیید آن یکسان نیستند');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const result = await resetPassword(username, newPassword, otpCode);
            if (result) {
                setSuccess(t('passwordResetSuccess') || 'رمز عبور با موفقیت تغییر یافت');
                setTimeout(() => {
                    setMode('login');
                }, 2000);
            } else {
                setError(t('passwordResetError') || 'خطا در تغییر رمز عبور');
            }
        } catch (err) {
            setError(t('passwordResetError') || 'خطا در تغییر رمز عبور');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Google Login Handler - redirects to Google OAuth
    const handleGoogleLogin = () => {
        setIsLoading(true);
        setError('');
        loginWithGoogle();
        // Note: This redirects the browser, so we don't need to handle response
    };

    // Back Button Component
    const BackButton = () => (
        <motion.button
            type="button"
            onClick={() => {
                setMode('login');
                setError('');
                setSuccess('');
            }}
            className="login-back-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <ArrowRight className="w-4 h-4" />
            <span>{language === 'fa' ? 'بازگشت' : 'Back'}</span>
        </motion.button>
    );

    if (!isOpen) return null;

    const themeClass = theme === 'matrix' ? 'theme-matrix' : 'theme-default';

    return (
        <AnimatePresence>
            <motion.div
                className="login-panel-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Floating Top Controls: Language, Theme & Video Background Switcher */}
                <div className="login-panel-top-bar">
                    <LanguageSwitcher />
                    <ThemeSwitcher />
                    <motion.button
                        type="button"
                        onClick={toggleBackground}
                        className={`glass-card backdrop-blur-xl border border-white/10 rounded-full px-3.5 py-2 flex items-center gap-2 transition-all duration-300 cursor-pointer ${
                            theme === 'matrix'
                                ? 'hover:border-[#00FF66]/50 text-emerald-200/90 hover:text-white'
                                : 'hover:border-[#00F0FF]/40 text-white/80 hover:text-white'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            boxShadow: theme === 'matrix' ? '0 4px 12px rgba(0, 255, 102, 0.15)' : '0 4px 12px rgba(0, 240, 255, 0.1)',
                        }}
                        title={language === 'fa' ? 'تغییر ویدیوی پس‌زمینه' : 'Switch Background Video'}
                    >
                        <Film className={`w-4 h-4 ${theme === 'matrix' ? 'text-[#00FF66]' : 'text-[#00F0FF]'}`} />
                        <span className="text-xs font-medium tracking-wide">
                            {language === 'fa' ? (currentBg === 'login-bg' ? 'ویدیو ۱' : 'ویدیو ۲') : (currentBg === 'login-bg' ? 'Video 1' : 'Video 2')}
                        </span>
                    </motion.button>
                </div>

                {/* Enhanced Background Video */}
                <div className="login-panel-background">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="login-video-background"
                        key={currentBg}
                    >
                        <source src={`/video/${currentBg}.webm`} type="video/webm" />
                        <source src={`/video/${currentBg}.mp4`} type="video/mp4" />
                    </video>
                    <div className="login-panel-vignette" />
                </div>

                {/* Main Content Container */}
                <div className="login-panel-content">

                    {/* Error/Success Messages - Bottom Right */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                className="fixed bottom-6 right-6 max-md:bottom-4 max-md:right-4 max-md:left-4 w-96 max-w-[calc(100vw-2rem)] p-3 rounded-xl bg-[#FF2E2E]/30 border-2 border-[#FF2E2E]/50 flex items-center justify-center gap-3 backdrop-blur-xl z-[200] shadow-2xl"
                                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                                transition={{ type: 'spring', damping: 15 }}
                            >
                                <AlertCircle className="w-5 h-5 text-[#FF2E2E] flex-shrink-0" />
                                <span className="text-[#FF2E2E] text-sm font-semibold">{error}</span>
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                className="fixed bottom-6 right-6 max-md:bottom-4 max-md:right-4 max-md:left-4 w-96 max-w-[calc(100vw-2rem)] p-3 rounded-xl bg-[#00FF9D]/30 border-2 border-[#00FF9D]/50 flex items-center justify-center gap-3 backdrop-blur-xl z-[200] shadow-2xl"
                                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                                transition={{ type: 'spring', damping: 15 }}
                            >
                                <CheckCircle className="w-5 h-5 text-[#00FF9D] flex-shrink-0" />
                                <span className="text-[#00FF9D] text-sm font-semibold">{success}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Brand/Header Area with Typing Effect */}
                    <motion.div
                        className="login-panel-brand"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{ minHeight: '80px' }}
                    >
                        <h1
                            className="login-panel-title notranslate"
                            translate="no"
                            onClick={toggleBackground}
                            title="تغییر پس‌زمینه"
                        >
                            <span>{displayedTitle}</span>
                            <span className="login-panel-cursor">|</span>
                        </h1>
                        <p
                            className="login-panel-subtitle notranslate"
                            translate="no"
                        >
                            <span>{displayedSubtitle}</span>
                            <span className="login-panel-subtitle-cursor">|</span>
                        </p>
                    </motion.div>

                    {/* Login Card */}
                    <motion.div
                        style={{ position: 'relative' }}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Card Glow Effect */}
                        <div className={`login-panel-card-glow ${themeClass}`} />

                        <div className={`login-panel-card ${themeClass}`}>
                            {/* Content */}
                            <div className="login-panel-card-content">

                                {/* Login Mode */}
                                {mode === 'login' && (
                                    <form onSubmit={handleLogin} className="space-y-2 w-full">
                                        <div className="text-center mb-1">
                                            <h2 className={`text-base font-bold mb-0.5 tracking-wide ${theme === 'matrix' ? 'text-[#ECFDF5] drop-shadow-[0_0_12px_rgba(0,255,102,0.6)]' : 'text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]'}`}>
                                                {language === 'fa' ? 'ورود به سامانه' : 'Sign In'}
                                            </h2>
                                            <p className={`${theme === 'matrix' ? 'text-emerald-200/75' : 'text-white/70'} text-[0.65rem]`}>
                                                {language === 'fa' ? 'اطلاعات کاربری خود را وارد کنید' : 'Enter your account credentials'}
                                            </p>
                                        </div>

                                        <div className="space-y-0.5">
                                            <div className="login-panel-input-wrapper">
                                                <div className="login-panel-icon-left">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={e => setUsername(e.target.value)}
                                                    className="login-panel-input has-left-icon"
                                                    placeholder={t('usernamePlaceholder') || (language === 'fa' ? 'نام کاربری' : 'Username')}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="login-panel-input-wrapper">
                                                <div className="login-panel-icon-left">
                                                    <Lock className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    className="login-panel-input has-left-icon has-right-icon"
                                                    placeholder={t('passwordPlaceholder') || (language === 'fa' ? 'رمز عبور' : 'Password')}
                                                    required
                                                />
                                                <div
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="login-panel-icon-right"
                                                >
                                                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 px-1 w-[85%] mx-auto">
                                            <label className="flex items-center gap-1.5 cursor-pointer group select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={rememberMe}
                                                    onChange={e => setRememberMe(e.target.checked)}
                                                    className={`w-3.5 h-3.5 rounded border border-white/30 bg-black/40 focus:ring-0 cursor-pointer ${theme === 'matrix' ? 'accent-[#00FF66] text-[#00FF66]' : 'accent-[#00F0FF] text-[#00F0FF]'}`}
                                                />
                                                <span className={`${theme === 'matrix' ? 'text-emerald-100/90 group-hover:text-emerald-50' : 'text-white/80 group-hover:text-white'} text-[0.68rem] transition-colors`}>
                                                    {t('rememberMe') || (language === 'fa' ? 'مرا به خاطر بسپار' : 'Remember me')}
                                                </span>
                                            </label>

                                            <button
                                                type="button"
                                                onClick={() => setMode('recovery')}
                                                className={`${theme === 'matrix' ? 'text-[#00FF66] hover:text-[#34D399]' : 'text-[#00F0FF] hover:text-[#00FF9D]'} text-[0.68rem] hover:underline transition-colors font-medium cursor-pointer`}
                                            >
                                                {t('forgotPassword') || (language === 'fa' ? 'فراموشی رمز عبور؟' : 'Forgot password?')}
                                            </button>
                                        </div>

                                        <motion.button
                                            type="submit"
                                            disabled={isLoading}
                                            className="login-panel-button-primary mt-1"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Loader className="w-3.5 h-3.5 animate-spin" />
                                                    <span className="text-xs">{language === 'fa' ? 'در حال ورود...' : 'Signing in...'}</span>
                                                </div>
                                            ) : (
                                                language === 'fa' ? 'ورود به سامانه' : 'Sign In'
                                            )}
                                        </motion.button>

                                        <div className="relative my-1.5 w-[85%] mx-auto">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className={`w-full border-t ${theme === 'matrix' ? 'border-emerald-500/20' : 'border-white/15'}`}></div>
                                            </div>
                                            <div className="relative flex justify-center text-[0.6rem]">
                                                <span className={`px-2 rounded-full border ${theme === 'matrix' ? 'bg-[#03150a]/90 text-emerald-300/80 border-emerald-500/25' : 'bg-[#0a1220]/90 text-white/60 border-white/10'}`}>
                                                    {t('or') || (language === 'fa' ? 'یا ورود با' : 'or continue with')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="login-auth-icons" style={{ marginTop: '0.25rem' }}>
                                            {/* Google Login Button */}
                                            <motion.button
                                                type="button"
                                                onClick={handleGoogleLogin}
                                                className="login-icon-button google-btn"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                title={language === 'fa' ? 'ورود با حساب گوگل' : 'Sign in with Google'}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? <Loader className="w-4 h-4 animate-spin text-white/50" /> : (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                    </svg>
                                                )}
                                            </motion.button>

                                            {/* SMS OTP Button */}
                                            <motion.button
                                                type="button"
                                                onClick={() => setMode('otp')}
                                                className="login-icon-button"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                title={language === 'fa' ? 'ورود با کد یکبار مصرف پیامکی' : 'Sign in with SMS OTP'}
                                                disabled={isLoading}
                                            >
                                                <Phone className={`w-5 h-5 ${theme === 'matrix' ? 'text-[#00FF66]' : 'text-[#00F0FF]'}`} />
                                            </motion.button>
                                        </div>
                                    </form>
                                )}

                                {mode === 'otp' && (
                                    <form onSubmit={otpTimer > 0 ? (e) => { e.preventDefault(); handleVerifyOTP(); } : handleRequestOTP} className="space-y-2.5 w-full">
                                        <motion.button
                                            type="button"
                                            onClick={() => {
                                                setMode('login');
                                                setError('');
                                                setSuccess('');
                                            }}
                                            className="login-back-button"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                            <span>بازگشت</span>
                                        </motion.button>
                                        <div className="text-center mb-1">
                                            <h2 className="text-base font-bold text-white mb-0.5">ورود با پیامک</h2>
                                            <p className="text-white/50 text-[0.6rem]">
                                                {otpTimer > 0 ? 'کد ارسال شده را وارد کنید' : 'شماره موبایل خود را وارد کنید'}
                                            </p>
                                        </div>

                                        {otpTimer === 0 ? (
                                            <div className="space-y-2.5">
                                                <div className="login-panel-input-wrapper">
                                                    <div className="login-panel-icon-left">
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={e => setPhone(e.target.value)}
                                                        className="login-panel-input has-left-icon"
                                                        placeholder="شماره موبایل (مثلاً 0912...)"
                                                        required
                                                        dir="ltr"
                                                    />
                                                </div>
                                                <motion.button
                                                    type="submit"
                                                    disabled={isLoading}
                                                    className="login-panel-button-primary"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    {isLoading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'ارسال کد تأیید'}
                                                </motion.button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2.5">
                                                <div className="login-panel-input-wrapper text-center">
                                                    <input
                                                        type="text"
                                                        value={otpCode}
                                                        onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                                        className="login-panel-input text-center tracking-[0.5em] text-lg font-mono"
                                                        placeholder="------"
                                                        required
                                                        maxLength={6}
                                                        dir="ltr"
                                                    />
                                                </div>
                                                <div className="otp-timer">
                                                    <Clock className="w-3 h-3 inline-block mr-1" />
                                                    {formatTime(otpTimer)}
                                                </div>
                                                <motion.button
                                                    type="submit"
                                                    disabled={isLoading || otpCode.length !== 6}
                                                    className="login-panel-button-primary"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    {isLoading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'تأیید و ورود'}
                                                </motion.button>
                                                <button
                                                    type="button"
                                                    onClick={() => setOtpTimer(0)}
                                                    className="w-full text-xs text-white/40 hover:text-[#00F0FF] transition-colors"
                                                >
                                                    تغییر شماره یا ارسال مجدد
                                                </button>
                                            </div>
                                        )}
                                    </form>
                                )}

                                {/* Password Recovery Mode */}
                                {mode === 'recovery' && (
                                    <form onSubmit={handlePasswordReset} className="space-y-2.5 w-full">
                                        <motion.button
                                            type="button"
                                            onClick={() => {
                                                setMode('login');
                                                setError('');
                                                setSuccess('');
                                            }}
                                            className="login-back-button"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                            <span>بازگشت</span>
                                        </motion.button>
                                        <div className="text-center mb-1">
                                            <h2 className="text-base font-bold text-white mb-0.5">بازیابی رمز</h2>
                                            <p className="text-white/50 text-[0.6rem]">اطلاعات جدید را وارد کنید</p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="login-panel-input-wrapper">
                                                <div className="login-panel-icon-left">
                                                    <User className="w-3.5 h-3.5" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={e => setUsername(e.target.value)}
                                                    className="login-panel-input has-left-icon"
                                                    placeholder="نام کاربری"
                                                    required
                                                />
                                            </div>

                                            <div className="login-panel-input-wrapper">
                                                <div className="login-panel-icon-left">
                                                    <Lock className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={e => setNewPassword(e.target.value)}
                                                    className="login-panel-input has-left-icon"
                                                    placeholder="رمز عبور جدید"
                                                    required
                                                />
                                            </div>

                                            {/* Password Strength Indicator */}
                                            {newPassword && (
                                                <div className="password-strength">
                                                    <div
                                                        className={`password-strength-bar ${newPassword.length < 6 ? 'strength-weak' :
                                                            newPassword.length < 10 ? 'strength-medium' : 'strength-strong'
                                                            }`}
                                                    />
                                                </div>
                                            )}

                                            <div className="login-panel-input-wrapper">
                                                <div className="login-panel-icon-left">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </div>
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    className="login-panel-input has-left-icon"
                                                    placeholder="تکرار رمز عبور"
                                                    required
                                                />
                                            </div>

                                            <motion.button
                                                type="submit"
                                                disabled={isLoading}
                                                className="login-panel-button-primary"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {isLoading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'تغییر رمز عبور'}
                                            </motion.button>
                                        </div>
                                    </form>
                                )}

                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div >
        </AnimatePresence >
    );
}
