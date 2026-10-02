import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { api } from '../../../utils/api';

interface User {
    id: string;
    username: string;
    fullName: string;
    role: string;
    clearanceLevel: number;
    avatar?: string;
    email?: string;
    lastLogin?: string;
    isOnline: boolean;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    loginWithOTP: (phone: string, otp: string) => Promise<boolean>;
    loginWith2FA: (username: string, password: string, code: string) => Promise<boolean>;
    loginWithGoogle: () => void;
    logout: () => void;
    requestOTP: (phone: string) => Promise<boolean>;
    verifyOTP: (phone: string, otp: string) => Promise<boolean>;
    requestPasswordReset: (username: string) => Promise<boolean>;
    resetPassword: (username: string, newPassword: string, code: string) => Promise<boolean>;
    updateProfile: (data: { fullName?: string; email?: string }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_KEY = 'sentry_token';
const USER_KEY = 'sentry_user';
const getApiUrl = (): string => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8000';
    }
    return 'https://rynix.ir';
};

const API_URL = getApiUrl();

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check session validity
    const isSessionValid = useCallback(() => {
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (!expiry) return false;
        return Date.now() < parseInt(expiry);
    }, []);

    // Validate token with backend
    const validateToken = useCallback(async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token || !isSessionValid()) {
            logout();
            return false;
        }

        try {
            const response = await api.get<{ valid: boolean; user?: User }>('/auth/validate', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.valid && response.user) {
                setUser(response.user);
                return true;
            }
        } catch (e) {
            console.warn('Token validation failed:', e);
        }

        logout();
        return false;
    }, [isSessionValid]);

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            // 1. Check URL for token (Google OAuth)
            const params = new URLSearchParams(window.location.search);
            const urlToken = params.get('token');

            if (urlToken) {
                console.log("Found token in URL, logging in...");
                // Calculate estimated expiry since backend didn't send it in URL params, or decode JWT
                // For now, allow validateToken to handle expiry or set a default.
                const defaultExpiry = Date.now() + SESSION_DURATION;

                localStorage.setItem(TOKEN_KEY, urlToken);
                localStorage.setItem(TOKEN_EXPIRY_KEY, defaultExpiry.toString());

                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);

                // Immediately validate to get user details
                const isValid = await validateToken();
                if (isValid) {
                    setIsLoading(false);
                    return;
                }
                // If validation fails, fall through to checking stored user
            }

            const storedUser = localStorage.getItem(USER_KEY);
            const token = localStorage.getItem(TOKEN_KEY);

            if (storedUser && token && isSessionValid()) {
                try {
                    setUser(JSON.parse(storedUser));
                    // Validate with backend in background
                    validateToken();
                } catch (error) {
                    console.error('Failed to parse stored user:', error);
                    logout();
                }
            }
            setIsLoading(false);
        };

        checkSession();

        // Set up session expiry check
        const interval = setInterval(() => {
            if (!isSessionValid()) {
                logout();
            }
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [isSessionValid, validateToken]);

    // Real login with backend API
    const login = async (username: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post<{
                access_token: string;
                expires_in: number;
                user: User;
            }>('/auth/login', { username, password });

            // Store token and user
            const expiryTime = Date.now() + (response.expires_in * 1000);
            localStorage.setItem(TOKEN_KEY, response.access_token);
            localStorage.setItem(USER_KEY, JSON.stringify(response.user));
            localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

            setUser(response.user);
            setIsLoading(false);
            return true;

        } catch (e: any) {
            setError(e.message || 'خطا در ورود');
            setIsLoading(false);
            return false;
        }
    };

    // OTP-based login - sends OTP to phone number
    const requestOTP = async (phone: string): Promise<boolean> => {
        setError(null);
        try {
            const response = await api.post<{ success: boolean; message: string }>('/auth/otp/send', { phone });
            return response.success;
        } catch (e: any) {
            setError(e.message || 'خطا در ارسال کد تأیید');
            return false;
        }
    };

    const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
        setError(null);
        try {
            const response = await api.post<{
                success: boolean;
                access_token: string;
                expires_in: number;
                user: User;
            }>('/auth/otp/verify', { phone, otp });

            if (response.success && response.access_token) {
                const expiryTime = Date.now() + (response.expires_in * 1000);
                localStorage.setItem(TOKEN_KEY, response.access_token);
                localStorage.setItem(USER_KEY, JSON.stringify(response.user));
                localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
                setUser(response.user);
                return true;
            }
            return false;
        } catch (e: any) {
            setError(e.message || 'کد تأیید اشتباه است');
            return false;
        }
    };

    const loginWithOTP = async (phone: string, otp: string): Promise<boolean> => {
        setIsLoading(true);
        const result = await verifyOTP(phone, otp);
        setIsLoading(false);
        return result;
    };

    // 2FA login (placeholder for future implementation)
    const loginWith2FA = async (username: string, password: string, _code: string): Promise<boolean> => {
        // Not implemented - fall back to normal login
        return login(username, password);
    };

    // Password reset (placeholder for future implementation)
    const requestPasswordReset = async (username: string): Promise<boolean> => {
        console.log('Password reset requested for:', username);
        return false;
    };

    const resetPassword = async (_username: string, _newPassword: string, _code: string): Promise<boolean> => {
        return false;
    };

    // Update profile
    const updateProfile = async (data: { fullName?: string; email?: string }): Promise<boolean> => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return false;

        try {
            await api.put('/profile/', {
                full_name: data.fullName,
                email: data.email
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local user
            if (user) {
                const updatedUser = {
                    ...user,
                    fullName: data.fullName || user.fullName,
                    email: data.email || user.email
                };
                setUser(updatedUser);
                localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
            }

            return true;
        } catch (e) {
            console.error('Profile update failed:', e);
            return false;
        }
    };

    // Logout function
    const logout = () => {
        console.log('AuthContext: logout called');
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
    };

    // Google OAuth - redirects to Google login
    const loginWithGoogle = () => {
        window.location.href = `${API_URL}/auth/google`;
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user && isSessionValid(),
        isLoading,
        error,
        login,
        loginWithOTP,
        loginWith2FA,
        loginWithGoogle,
        logout,
        requestOTP,
        verifyOTP,
        requestPasswordReset,
        resetPassword,
        updateProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

