export interface Activity {
    id: number;
    type: 'success' | 'error' | 'warning' | 'pending';
    message: string;
    timestamp: string;
}
