import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppSettings } from '../features/settings/contexts/AppSettingsContext';
import { api } from '../utils/api';
import { useSearchParams } from 'react-router-dom';
import { RegistrationModal } from '../features/users/components/RegistrationModal';
import { toast } from 'sonner';

// User type matching backend response
export interface UserData {
    id: number;
    name: string;
    role: string;
    avatar_url?: string;
    rfid_tag: string;
    is_active?: boolean;
    level?: number;
}

export default function Users() {
    const { t } = useLanguage();
    const { theme } = useAppSettings();
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [searchParams, setSearchParams] = useSearchParams();
    const isRegisterOpen = searchParams.get('register') === 'true';
    const initialRfidParam = searchParams.get('rfid');

    const primaryColor = theme === 'matrix' ? '#00FF00' : '#00F0FF';

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.get<UserData[]>('/users/');
            setUsers(data);
        } catch (error) {
            console.error(error);
            toast.error(t('fetchUsersFailed') || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleDeleteUser = async (id: number) => {
        if (!confirm(t('confirmDelete') || 'Are you sure?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success(t('userDeleted') || 'User deleted');
            fetchUsers();
            setSelectedUser(null);
        } catch (error) {
            toast.error(t('deleteFailed') || 'Failed to delete');
        }
    };

    const closeRegisterModal = () => {
        setSearchParams({}, { replace: true });
    };

    const getStatusColor = (status: boolean) => {
        return status ? '#00FF9D' : '#64748b';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="tracking-wide" style={{ color: primaryColor }}>{t('authorizedUsers') || 'کاربران مجاز'}</h2>
                <button
                    onClick={() => setSearchParams({ register: 'true' })}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 transition-colors text-sm font-medium border border-white/5"
                >
                    <Plus size={16} />
                    <span>{t('addUser') || 'افزودن کاربر'}</span>
                </button>
            </div>

            {/* Users Grid */}
            {loading ? (
                <div className="text-center py-12 text-white/40">{t('loading') || 'Loading...'}</div>
            ) : users.length === 0 ? (
                <div className="text-center py-12 text-white/40">{t('noUsers') || 'No users found'}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {users.map((user) => (
                        <motion.div
                            key={user.id}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedUser(user)}
                            className="glass-card p-5 rounded-2xl backdrop-blur-xl border border-white/10 hover:border-[#00F0FF]/40 transition-all duration-300 cursor-pointer group"
                            style={{ boxShadow: 'none' }}
                        >
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="relative">
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
                                        style={{
                                            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}AA)`,
                                            color: '#050505',
                                        }}
                                    >
                                        {user.name.charAt(0)}
                                    </div>
                                    <div
                                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
                                        style={{
                                            background: getStatusColor(user.is_active !== false),
                                            borderColor: theme === 'matrix' ? '#000' : '#0a0a14',
                                        }}
                                    />
                                </div>

                                {/* User Info */}
                                <div className="flex-1">
                                    <div className="text-white/90 font-semibold text-base">{user.name}</div>
                                    <div className="text-white/40 text-sm">{t('role') || 'نقش'}: {user.role}</div>
                                    <div className="text-white/20 text-xs font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{user.rfid_tag}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* User Details Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[150] flex items-center justify-center px-4"
                        onClick={() => setSelectedUser(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="relative w-full max-w-[400px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="rounded-3xl border border-white/10 bg-[#0a0a14] p-6 text-center shadow-2xl">
                                <h3 className="text-xl font-bold text-white mb-2">{selectedUser.name}</h3>
                                <div className="text-white/60 mb-2 font-mono text-sm">{selectedUser.rfid_tag}</div>
                                <div className="text-[#00F0FF] mb-4 text-sm font-semibold uppercase">{selectedUser.role}</div>

                                {/* Placeholder for editing - can be expanded */}

                                <div className="flex gap-3 justify-center mt-6">
                                    <button
                                        onClick={() => handleDeleteUser(selectedUser.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors font-medium text-sm"
                                    >
                                        <Trash2 size={16} />
                                        {t('delete') || 'حذف'}
                                    </button>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 border border-white/10 rounded-xl transition-colors font-medium text-sm"
                                    >
                                        {t('close') || 'بستن'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Registration Modal */}
            <RegistrationModal
                isOpen={isRegisterOpen}
                onClose={closeRegisterModal}
                onSuccess={fetchUsers}
                initialRfid={initialRfidParam || undefined}
            />
        </div>
    );
}
