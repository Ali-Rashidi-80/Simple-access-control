import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../auth/contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { UserAvatar } from '../../user/components/UserAvatar';
import { User, Mail, Shield, Key, Save, Camera } from 'lucide-react';

export function ProfileSettings() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        email: user?.username + '@example.com', // Mock email
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically update the user profile
        console.log('Profile update:', formData);
        setIsEditing(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-[#00F0FF] tracking-wide text-xl font-bold mb-6 flex items-center gap-3">
                <User className="w-6 h-6" />
                {t('profileSettings') || 'تنظیمات پروفایل'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-1"
                >
                    <div className="glass-card p-6 rounded-2xl backdrop-blur-xl border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-[#00F0FF]/5 to-transparent pointer-events-none" />

                        <div className="relative mb-4 group cursor-pointer">
                            <div className="p-1 rounded-full border-2 border-[#00F0FF]/30 group-hover:border-[#00F0FF] transition-colors duration-300">
                                <UserAvatar
                                    alt={user?.fullName}
                                    initials={user?.fullName?.slice(0, 2)}
                                    status="online"
                                    size="large"
                                />
                            </div>
                            <div className="absolute bottom-0 right-0 bg-[#050505] p-1.5 rounded-full border border-white/20 text-white/70 group-hover:text-[#00F0FF] transition-colors">
                                <Camera className="w-4 h-4" />
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1">{user?.fullName}</h3>
                        <p className="text-white/50 text-sm mb-4">@{user?.username}</p>

                        <div className="w-full space-y-3 mt-2">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-white/60 text-sm">{t('role') || 'نقش'}</span>
                                <span className="text-[#00F0FF] text-sm font-medium flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    {user?.role}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-white/60 text-sm">{t('clearanceLevel') || 'سطح دسترسی'}</span>
                                <span className="text-[#00FF9D] text-sm font-medium">Level {user?.clearanceLevel}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Edit Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-2"
                >
                    <div className="glass-card p-6 rounded-2xl backdrop-blur-xl border border-white/10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-white/70 text-sm flex items-center gap-2">
                                        <User className="w-4 h-4 text-[#00F0FF]" />
                                        {t('fullName') || 'نام و نام خانوادگی'}
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[#00F0FF]/50 focus:bg-white/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-white/70 text-sm flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-[#00F0FF]" />
                                        {t('email') || 'ایمیل'}
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[#00F0FF]/50 focus:bg-white/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-6">
                                <h4 className="text-white/90 font-medium mb-4 flex items-center gap-2">
                                    <Key className="w-4 h-4 text-[#00FF9D]" />
                                    {t('security') || 'امنیت'}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-white/70 text-sm">{t('currentPassword') || 'رمز عبور فعلی'}</label>
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[#00F0FF]/50 focus:bg-white/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-white/70 text-sm">{t('newPassword') || 'رمز عبور جدید'}</label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="••••••••"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[#00F0FF]/50 focus:bg-white/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                {isEditing ? (
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
                                        >
                                            {t('cancel') || 'انصراف'}
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#0064FF] text-white font-medium hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all flex items-center gap-2"
                                        >
                                            <Save className="w-4 h-4" />
                                            {t('saveChanges') || 'ذخیره تغییرات'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[#00F0FF]/30 transition-all"
                                    >
                                        {t('editProfile') || 'ویرایش پروفایل'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>

            {/* Mobile Bottom Spacer - Smart spacing for navigation */}
            <div className="h-32 pb-safe md:hidden" aria-hidden="true" />
        </div>
    );
}
