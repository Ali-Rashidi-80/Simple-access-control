import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';

// Types matches Backend schemas
export interface AccessLog {
    id: number;
    user_name: string;
    action: "GRANTED" | "DENIED";
    timestamp: string;
    is_duress: boolean;
    temperature: number;
    avatar_url?: string;
}

interface WebSocketContextType {
    isConnected: boolean;
    logs: AccessLog[];
    lastUnknownTag: { uid: string; timestamp: string } | null;
    sendMessage: (msg: any) => void;
    clearUnknownTag: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [lastUnknownTag, setLastUnknownTag] = useState<{ uid: string; timestamp: string } | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<any>(null);

    const connect = () => {
        const validProtocols = ['https:', 'wss:'];
        const isSecure = validProtocols.includes(window.location.protocol);
        const wsProtocol = isSecure ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname;
        // If in dev (localhost), port might be different (8000), but in prod (docker), it's same host/port via nginx proxy
        // We can use a heuristic: if we are on localhost:5173 (vite default), assume backend is localhost:8000
        // If we are on port 80/443 (prod), assume /ws/frontend is proxied correctly.

        let wsUrl = '';
        if (window.location.port === '5173') {
            wsUrl = 'ws://localhost:8000/ws/frontend';
        } else {
            // Production / Docker
            wsUrl = `${wsProtocol}//${wsHost}:${window.location.port || (isSecure ? '443' : '80')}/ws/frontend`;
        }

        console.log("Connecting to WS:", wsUrl);
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('WS Connected');
            setIsConnected(true);
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('WS Message:', message);

                if (message.type === 'ACCESS_LOG') {
                    // Prepend new log
                    setLogs((prev) => [message.data, ...prev].slice(0, 50)); // Keep last 50
                } else if (message.type === 'UNKNOWN_TAG') {
                    setLastUnknownTag({ uid: message.uid, timestamp: message.timestamp });
                }
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        socket.onclose = () => {
            console.log('WS Disconnected');
            setIsConnected(false);
            // Auto reconnect
            reconnectTimeout.current = setTimeout(connect, 3000);
        };

        socket.onerror = (err) => {
            console.error('WS Error', err);
            socket.close();
        };

        ws.current = socket;
    };

    useEffect(() => {
        connect();
        return () => {
            ws.current?.close();
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        };
    }, []);

    const sendMessage = (msg: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(msg));
        }
    };

    const clearUnknownTag = () => setLastUnknownTag(null);

    return (
        <WebSocketContext.Provider value={{ isConnected, logs, lastUnknownTag, sendMessage, clearUnknownTag }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
    return context;
};
