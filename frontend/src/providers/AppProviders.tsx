import { ReactNode } from 'react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { AppSettingsProvider } from '../features/settings/contexts/AppSettingsContext';
import { AuthProvider } from '../features/auth/contexts/AuthContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { Toaster } from 'sonner';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <LanguageProvider>
            <AppSettingsProvider>
                <AuthProvider>
                    <WebSocketProvider>
                        {children}
                        <Toaster richColors position="top-center" theme="dark" />
                    </WebSocketProvider>
                </AuthProvider>
            </AppSettingsProvider>
        </LanguageProvider>
    );
}
