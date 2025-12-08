import { useWebSocket } from '../../contexts/WebSocketContext';
import { useAppSettings } from '../settings/contexts/AppSettingsContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Wifi, WifiOff, Thermometer, UserCheck } from 'lucide-react';

const Dashboard = () => {
    const { isConnected, logs, sendMessage } = useWebSocket();

    const { timerDuration } = useAppSettings();

    const handleRemoteOpen = () => {
        sendMessage({ cmd: "OPEN", duration: timerDuration });
    };

    const currentTemp = logs.length > 0 ? logs[0].temperature : '--';
    const lastAccess = logs.length > 0 ? new Date(logs[0].timestamp).toLocaleTimeString() : '--';

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    SentryGate Dashboard
                </h1>
                <div className={`p-2 rounded-full ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isConnected ? <Wifi size={24} /> : <WifiOff size={24} />}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-black/40 border-slate-800">
                    <div className="flex items-center space-x-4">
                        <Thermometer className="text-orange-400" size={32} />
                        <div>
                            <div className="text-slate-400 text-sm">Temperature</div>
                            <div className="text-2xl font-mono">{currentTemp}°C</div>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-black/40 border-slate-800">
                    <div className="flex items-center space-x-4">
                        <UserCheck className="text-blue-400" size={32} />
                        <div>
                            <div className="text-slate-400 text-sm">Last Access</div>
                            <div className="text-2xl font-mono">{lastAccess}</div>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-black/40 border-slate-800 flex items-center justify-center">
                    <Button
                        onClick={handleRemoteOpen}
                        className="w-full h-full bg-red-500 hover:bg-red-600 text-white font-bold text-xl py-4"
                        variant="destructive"
                    >
                        EMERGENCY OPEN
                    </Button>
                </Card>
            </div>

            <Card className="p-6 bg-black/40 border-slate-800">
                <h2 className="text-xl font-semibold mb-4 text-slate-200">Live Access Logs</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-500 border-b border-slate-800">
                                <th className="p-2">Time</th>
                                <th className="p-2">User</th>
                                <th className="p-2">Action</th>
                                <th className="p-2">Temp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                    <td className="p-2 text-slate-300 font-mono text-sm">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                    <td className="p-2 text-slate-200">{log.user_name}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.action === 'GRANTED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-2 text-slate-400 font-mono">{log.temperature}°C</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-slate-500">No logs yet...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
