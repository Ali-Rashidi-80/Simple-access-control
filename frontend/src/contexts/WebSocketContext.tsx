import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import useWebSocketHook, { ReadyState } from 'react-use-websocket';
import { toast } from 'sonner';
import { useLanguage } from './LanguageContext';

export interface LogEntry {
    id: number;
    user_name: string;
    action: string;
    timestamp: string;
    is_duress: boolean;
    temperature: number | null;
    avatar_url: string | null;
}

export interface UnknownTagData {
    uid: string;
    timestamp: string;
}

export interface GrantedAccessData {
    user_name: string;
    timestamp: string;
    is_duress: boolean;
}

interface WebSocketContextType {
    logs: LogEntry[];
    isConnected: boolean;
    lastUnknownTag: UnknownTagData | null;
    lastGrantedAccess: GrantedAccessData | null;
    clearUnknownTag: () => void;
    clearGrantedAccess: () => void;
    sendMessage: (msg: { cmd: "OPEN" }) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://rynix.ir/ws/frontend';

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const { t } = useLanguage();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [lastUnknownTag, setLastUnknownTag] = useState<UnknownTagData | null>(null);
    const [lastGrantedAccess, setLastGrantedAccess] = useState<GrantedAccessData | null>(null);

    // Auto-reconnect enabled
    const { sendMessage: sendRaw, lastJsonMessage, readyState } = useWebSocketHook(WS_URL, {
        onOpen: () => {
            console.log('WS Connected');
            toast.success(t('connected'));
        },
        onClose: () => {
            console.log('WS Disconnected');
        },
        shouldReconnect: () => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000,
    });

    const isConnected = readyState === ReadyState.OPEN;

    const clearUnknownTag = () => setLastUnknownTag(null);
    const clearGrantedAccess = () => setLastGrantedAccess(null);

    useEffect(() => {
        if (lastJsonMessage) {
            const msg = lastJsonMessage as any;
            if (msg.type === 'ACCESS_LOG') {
                const newLog = msg.data as LogEntry;
                setLogs((prev) => [newLog, ...prev].slice(0, 50));

                if (newLog.action === 'GRANTED') {
                    toast.success(`${t('accessGranted')}: ${newLog.user_name}`);
                    // Set last granted access for auto-unlock
                    setLastGrantedAccess({
                        user_name: newLog.user_name,
                        timestamp: newLog.timestamp,
                        is_duress: newLog.is_duress
                    });
                } else {
                    toast.error(`${t('accessDenied')}: ${newLog.user_name}`);
                }
            }
            else if (msg.type === 'UNKNOWN_TAG') {
                setLastUnknownTag({ uid: msg.uid, timestamp: msg.timestamp });
            }
        }
    }, [lastJsonMessage, t]);

    const sendMessage = (msg: { cmd: "OPEN" }) => {
        sendRaw(JSON.stringify(msg));
    };

    return (
        <WebSocketContext.Provider value={{
            logs,
            isConnected,
            lastUnknownTag,
            lastGrantedAccess,
            clearUnknownTag,
            clearGrantedAccess,
            sendMessage
        }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}

