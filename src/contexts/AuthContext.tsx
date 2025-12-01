import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
    id: string;
    username: string;
    fullName: string;
    role: string;
    clearanceLevel: number;
    avatar?: string;
    lastLogin?: string;
    isOnline: boolean;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    loginWithOTP: (phone: string, otp: string) => Promise<boolean>;
    loginWith2FA: (username: string, password: string, code: string) => Promise<boolean>;
    logout: () => void;
    requestOTP: (phone: string) => Promise<boolean>;
    verifyOTP: (phone: string, otp: string) => Promise<boolean>;
    requestPasswordReset: (username: string) => Promise<boolean>;
    resetPassword: (username: string, newPassword: string, code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data for demonstration
const MOCK_USERS: Record<string, { password: string; user: User }> = {
    'admin': {
        password: 'admin123',
        user: {
            id: '1',
            username: 'admin',
            fullName: 'مدیر سیستم',
            role: 'مدیر',
            clearanceLevel: 5,
            avatar: undefined,
            lastLogin: new Date().toISOString(),
            isOnline: true,
        },
    },
    'operator': {
        password: 'operator123',
        user: {
            id: '2',
            username: 'operator',
            fullName: 'اپراتور سیستم',
            role: 'اپراتور',
            clearanceLevel: 3,
            avatar: undefined,
            lastLogin: new Date().toISOString(),
            isOnline: true,
        },
    },
};

// Mock OTP storage
const OTP_STORAGE: Record<string, { code: string; expiresAt: number }> = {};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('sentry_gate_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('sentry_gate_user');
            }
        }
        setIsLoading(false);
    }, []);

    // Mock login function
    const login = async (username: string, password: string): Promise<boolean> => {
        setIsLoading(true);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const userRecord = MOCK_USERS[username];
        if (userRecord && userRecord.password === password) {
            const loggedInUser = { ...userRecord.user, lastLogin: new Date().toISOString() };
            setUser(loggedInUser);
            localStorage.setItem('sentry_gate_user', JSON.stringify(loggedInUser));
            setIsLoading(false);
            return true;
        }

        setIsLoading(false);
        return false;
    };

    // Mock OTP request
    const requestOTP = async (phone: string): Promise<boolean> => {
        await new Promise(resolve => setTimeout(resolve, 800));

        // Generate random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with 5-minute expiration
        OTP_STORAGE[phone] = {
            code: otp,
            expiresAt: Date.now() + 5 * 60 * 1000,
        };

        // In a real app, this would send SMS
        console.log(`OTP for ${phone}: ${otp} (Valid for 5 minutes)`);

        return true;
    };

    // Mock OTP verification
    const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
        await new Promise(resolve => setTimeout(resolve, 800));

        const storedOTP = OTP_STORAGE[phone];
        if (!storedOTP) return false;

        if (storedOTP.expiresAt < Date.now()) {
            delete OTP_STORAGE[phone];
            return false;
        }

        return storedOTP.code === otp;
    };

    // Mock OTP login
    const loginWithOTP = async (phone: string, otp: string): Promise<boolean> => {
        const isValid = await verifyOTP(phone, otp);
        if (isValid) {
            const guestUser: User = {
                id: 'guest',
                username: 'guest',
                fullName: 'کاربر مهمان',
                role: 'مهمان',
                clearanceLevel: 1,
                lastLogin: new Date().toISOString(),
                isOnline: true,
            };
            setUser(guestUser);
            localStorage.setItem('sentry_gate_user', JSON.stringify(guestUser));
            delete OTP_STORAGE[phone];
            return true;
        }
        return false;
    };

    // Mock 2FA login
    const loginWith2FA = async (username: string, password: string, code: string): Promise<boolean> => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const userRecord = MOCK_USERS[username];
        if (userRecord && userRecord.password === password && code === '123456') {
            const loggedInUser = { ...userRecord.user, lastLogin: new Date().toISOString() };
            setUser(loggedInUser);
            localStorage.setItem('sentry_gate_user', JSON.stringify(loggedInUser));
            setIsLoading(false);
            return true;
        }

        setIsLoading(false);
        return false;
    };

    // Mock password reset request
    const requestPasswordReset = async (username: string): Promise<boolean> => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (MOCK_USERS[username]) {
            // Generate reset code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`Password reset code for ${username}: ${code}`);
            return true;
        }

        return false;
    };

    // Mock password reset
    const resetPassword = async (username: string, newPassword: string, code: string): Promise<boolean> => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In a real app, verify the code and update password
        if (MOCK_USERS[username] && code === '123456') {
            MOCK_USERS[username].password = newPassword;
            return true;
        }

        return false;
    };

    // Logout function
    const logout = () => {
        setUser(null);
        localStorage.removeItem('sentry_gate_user');
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithOTP,
        loginWith2FA,
        logout,
        requestOTP,
        verifyOTP,
        requestPasswordReset,
        resetPassword,
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
