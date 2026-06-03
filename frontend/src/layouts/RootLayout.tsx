import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../features/auth/contexts/AuthContext';
import { useAppSettings } from '../features/settings/contexts/AppSettingsContext';
import { usePerformanceMode } from '../hooks/usePerformanceMode';
import { Sidebar } from './Sidebar';
import { BottomNavigation } from './BottomNavigation';
import { LanguageSwitcher } from '../features/settings/components/LanguageSwitcher';
import { ThemeSwitcher } from '../features/settings/components/ThemeSwitcher';
import { UserProfile } from '../features/user/components/UserProfile';
import { LoginPanel } from '../features/auth/components/LoginPanel';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export default function RootLayout() {
    const { t, isRTL } = useLanguage();
    const { theme } = useAppSettings();
    const { isAuthenticated, isLoading } = useAuth();
    const { isLowPerformance, isMobile, isTablet } = usePerformanceMode();
    const navigate = useNavigate();
    const location = useLocation();

    // PERFORMANCE: Only render aurora blobs on high-performance desktop devices
    const shouldRenderAurora = !isLowPerformance && !isMobile && !isTablet;

    console.log('RootLayout Render:', { path: location.pathname, isAuthenticated, isLoading });

    // Map current path to active tab string for navigation components
    // /dashboard -> 'home' (legacy mapping for sidebar)
    // /logs -> 'logs'
    const getActiveTab = (pathname: string) => {
        const path = pathname.split('/')[1] || 'dashboard';
        if (path === 'dashboard') return 'home';
        return path;
    };

    // We need state for activeTab because Sidebar expects onTabChange
    // In a real router setup, activeTab is derived from URL, and onTabChange triggers navigation
    const activeTab = getActiveTab(location.pathname);

    const handleTabChange = (tab: string) => {
        const route = tab === 'home' ? '/dashboard' : `/${tab}`;
        navigate(route);
    };

    // Apply RTL to body
    useEffect(() => {
        if (isRTL) {
            document.body.classList.add('rtl');
            document.body.classList.remove('ltr');
            document.documentElement.dir = 'rtl';
            document.documentElement.lang = 'fa';
        } else {
            document.body.classList.add('ltr');
            document.body.classList.remove('rtl');
            document.documentElement.dir = 'ltr';
            document.documentElement.lang = 'en';
        }
    }, [isRTL]);

    // Apply Theme styles
    useEffect(() => {
        document.body.classList.remove('hacker-mode', 'light');
        if (theme === 'matrix') {
            document.body.classList.add('hacker-mode');
        }
    }, [theme]);

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/60">{t('loading') || 'در حال بارگذاری...'}</p>
                </div>
            </div>
        );
    }

    // Show only LoginPanel when not authenticated
    if (!isAuthenticated) {
        return (
            <div className={`min-h-screen bg-[#050505] text-white relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'} ${theme === 'matrix' ? 'hacker-mode' : ''}`}>
                {/* Aurora Background (Neon Theme) - PERF: Only on high-end desktop */}
                {theme === 'neon' && shouldRenderAurora && (
                    <div className="fixed inset-0 opacity-30 pointer-events-none">
                        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00F0FF] rounded-full blur-[150px] animate-aurora-1" />
                        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#00FF9D] rounded-full blur-[150px] animate-aurora-2" />
                        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-500 rounded-full blur-[150px] animate-aurora-3" />
                    </div>
                )}

                {/* Matrix Rain Background (Matrix Theme) */}
                {theme === 'matrix' && (
                    <div className="fixed inset-0 opacity-20 pointer-events-none">
                        <div className="hacker-grid" />
                    </div>
                )}

                <LoginPanel isOpen={true} onClose={() => { }} />
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-[#050505] text-white relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'} ${theme === 'matrix' ? 'hacker-mode' : ''}`}>
            {/* Background Aurora - PERF: Only on high-end desktop */}
            {theme === 'neon' && shouldRenderAurora && (
                <div className="fixed inset-0 opacity-30 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00F0FF] rounded-full blur-[150px] animate-aurora-1" />
                </div>
            )}

            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
            </div>

            {/* Main Content */}
            <div className={`relative z-10 ${isRTL ? 'md:mr-64' : 'md:ml-64'} transition-all duration-300`}>
                {/* Header */}
                <header
                    className="glass-card sticky top-0 z-[100] px-4 md:px-6 py-3 md:py-4"
                    style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(0, 240, 255, 0.05)',
                    }}
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h1
                                className={`tracking-wide text-base md:text-lg font-bold ${theme === 'matrix' ? 'font-mono' : ''}`}
                                style={{
                                    color: theme === 'matrix' ? '#00FF00' : '#00F0FF',
                                    textShadow: theme === 'matrix' ? '0 0 10px rgba(0, 255, 0, 0.5)' : '0 0 15px rgba(0, 240, 255, 0.3)',
                                }}
                            >
                                {theme === 'matrix' ? '> ' : ''}{t('appName')}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                            <ThemeSwitcher />
                            <LanguageSwitcher />
                            <UserProfile onNavigate={handleTabChange} />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="pt-6 px-4 pb-36 md:px-6 md:pt-6 md:pb-8">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
            </div>
        </div>
    );
}
