export interface Log {
    id: number;
    user: string;
    action: string;
    timestamp: string;
    status: 'success' | 'error' | 'pending';
    avatar?: string;
    location?: string;
    device?: string;
    isDuress?: boolean;
}
