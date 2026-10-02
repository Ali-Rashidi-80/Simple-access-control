import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../../contexts/LanguageContext';
import { api } from '../../../utils/api';
import { useWebSocket } from '../../../contexts/WebSocketContext';

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialRfid?: string;
}

export function RegistrationModal({ isOpen, onClose, onSuccess, initialRfid }: RegistrationModalProps) {
    const { t } = useLanguage();
    const { lastUnknownTag, clearUnknownTag } = useWebSocket();
    const [name, setName] = useState('');
    const [role, setRole] = useState('user');
    const [rfid, setRfid] = useState(initialRfid || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialRfid) setRfid(initialRfid);
        else if (lastUnknownTag) setRfid(lastUnknownTag.uid);
    }, [initialRfid, lastUnknownTag]);

    console.log('DEBUG_MODAL:', { rfid, loading, initialRfid, lastUnknownTag });

    const handleRegister = async () => {
        if (!name) return toast.error(t('nameRequired') || 'Name is required');
        if (!rfid) return toast.error(t('rfidRequired') || 'RFID Tag is required');

        setLoading(true);
        try {
            await api.post('/users/', {
                name,
                rfid_tag: rfid,
                role,
                avatar_url: "/avatars/default.png"
            });

            toast.success(t('userRegistered') || 'User Registered Successfully');
            if (lastUnknownTag && lastUnknownTag.uid === rfid) {
                clearUnknownTag();
            }
            onSuccess();
            onClose();
        } catch (e: any) {
            toast.error(e.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative z-10 w-full max-w-md glass-card p-6 rounded-3xl border border-white/10 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <PlusCircle className="text-[#00F0FF]" />
                            {t('registerNewCard') || 'ثبت کارت جدید'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">RFID Tag</label>
                                <div className="font-mono text-[#00F0FF] text-lg bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                                    <span>{rfid || '---'}</span>
                                    {!rfid && <span className="text-xs text-white/30 animate-pulse">Waiting for scan...</span>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">{t('fullName') || 'نام کامل'}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-[#00F0FF] focus:outline-none transition-colors"
                                    placeholder={t('enterName') || 'نام را وارد کنید...'}
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/40 mb-1">{t('role') || 'نقش'}</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:border-[#00F0FF] focus:outline-none appearance-none"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="guest">Guest</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors font-medium border border-white/5"
                                >
                                    {t('cancel') || 'لغو'}
                                </button>
                                <button
                                    onClick={handleRegister}
                                    disabled={loading || !rfid}
                                    className="flex-1 py-3 px-4 rounded-xl bg-[#00F0FF] text-black hover:bg-[#00F0FF]/90 transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? '...' : <><Save size={18} /> {t('save') || 'ثبت'}</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
