import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { LogFeedInteractive } from '../features/logs/components/LogFeedInteractive';
import { Log } from '../features/logs/types';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../utils/api';

interface BackendLog {
    id: number;
    user_name: string;
    action: string;
    timestamp: string;
    is_duress: boolean;
    temperature: number | null;
    rfid_tag: string | null;
}

interface LogsResponse {
    logs: BackendLog[];
    total: number;
    stats: {
        success: number;
        error: number;
        pending: number;
        all: number;
    };
}

export default function Logs() {
    const { logs: wsLogs } = useWebSocket();
    const { t } = useLanguage();
    const [dbLogs, setDbLogs] = useState<BackendLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [useBackend, setUseBackend] = useState(true);

    // Fetch logs from backend on mount
    const fetchLogs = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await api.get<LogsResponse>('/logs/?limit=100');
            setDbLogs(response.logs);
            setUseBackend(true);
        } catch (error) {
            console.warn('Failed to fetch logs from backend, using WebSocket:', error);
            setUseBackend(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Merge backend logs with new WebSocket logs
    const combinedLogs = useBackend
        ? [...wsLogs.filter(log => !dbLogs.some(db => db.id === log.id)), ...dbLogs]
        : wsLogs;

    // Transform logs to UI format
    const formattedLogs: Log[] = combinedLogs.map(log => ({
        id: log.id,
        user: log.user_name || t('unknown'),
        action: log.action,
        timestamp: log.timestamp,
        status: (log.action === 'GRANTED' || log.action === 'OPEN') ? 'success' :
            log.action === 'PENDING' ? 'pending' : 'error',
        avatar: undefined,
        location: t('serverRoom') || 'Server Room',
        device: 'Main Entrance',
        isDuress: log.is_duress
    }));

    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[#00F0FF]/30 border-t-[#00F0FF] rounded-full animate-spin" />
                </div>
            ) : (
                <LogFeedInteractive logs={formattedLogs} />
            )}
            <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
        </div>
    );
}

