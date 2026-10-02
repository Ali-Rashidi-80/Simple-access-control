import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function RouteErrorBoundary() {
    const error = useRouteError();
    let errorMessage = 'An unexpected error occurred';

    if (isRouteErrorResponse(error)) {
        errorMessage = `${error.status} ${error.statusText}: ${error.data?.message || ''}`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-card p-6 rounded-2xl border border-red-500/30 text-center space-y-4 shadow-2xl backdrop-blur-xl">
                <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
                    <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white mb-1">خطای غیرمنتظره در بارگذاری صفحه</h2>
                    <p className="text-xs text-white/50 font-mono break-all">{errorMessage}</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-[#00F0FF] to-[#00FF9D] text-black font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer"
                >
                    <RefreshCw className="w-4 h-4" />
                    بارگذاری مجدد
                </button>
            </div>
        </div>
    );
}
