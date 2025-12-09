import { useWebSocket } from '../contexts/WebSocketContext';
import { LogFeedInteractive } from '../features/logs/components/LogFeedInteractive';
import { Log } from '../features/logs/types';
import { useLanguage } from '../contexts/LanguageContext';

export default function Logs() {
    const { logs: contextLogs } = useWebSocket();
    const { t } = useLanguage();

    // Transform Context Logs (Backend shape) to UI Logs (Frontend shape)
    const formattedLogs: Log[] = contextLogs.map(log => ({
        id: log.id,
        user: log.user_name || t('unknown'),
        action: log.action,
        timestamp: log.timestamp,
        // Backend sends "GRANTED" or "DENIED". Map to "success" or "error".
        // Also handle "OPEN" if that ever gets logged.
        status: (log.action === 'GRANTED' || log.action === 'OPEN') ? 'success' : 'error',
        avatar: log.avatar_url,
        location: t('serverRoom') || 'Server Room',
        device: 'Main Entrance',
        isDuress: log.is_duress
    }));

    return (
        <div className="space-y-4">
            <LogFeedInteractive logs={formattedLogs} />
            <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
        </div>
    );
}
