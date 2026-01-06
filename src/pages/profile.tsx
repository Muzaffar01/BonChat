import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { saveUser } from '@/lib/users';

export default function Profile() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Notification settings
    const [notifEmail, setNotifEmail] = useState(true);
    const [notifPush, setNotifPush] = useState(true);
    const [notifReminders, setNotifReminders] = useState(true);

    // Password change
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            setUsername(user.username || '');
            setEmail(user.email || '');
            setAvatarUrl(user.avatar_url || '');
            if (user.notification_settings) {
                setNotifEmail(user.notification_settings.email);
                setNotifPush(user.notification_settings.push);
                setNotifReminders(user.notification_settings.meeting_reminders);
            }
        }
    }, [user, loading, router]);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setAvatarUrl(data.publicUrl);

            // Auto-save the avatar URL to profile
            if (user) {
                await saveUser({
                    ...user,
                    avatar_url: data.publicUrl
                });
            }

            setMessage({ text: 'Avatar updated successfully!', type: 'success' });
        } catch (error: any) {
            setMessage({ text: error.message, type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            if (!user) return;

            // 1. Update Profile in users table
            await saveUser({
                ...user,
                username,
                email,
                avatar_url: avatarUrl,
                notification_settings: {
                    email: notifEmail,
                    push: notifPush,
                    meeting_reminders: notifReminders
                }
            });

            // 2. Update Email in Auth (if changed)
            if (email !== user.email) {
                const { error: emailError } = await supabase.auth.updateUser({ email });
                if (emailError) throw emailError;
                setMessage({ text: 'Profile updated. Please check your new email for confirmation.', type: 'success' });
            } else {
                setMessage({ text: 'Profile updated successfully!', type: 'success' });
            }

            // 3. Update Password (if provided)
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
                if (pwdError) throw pwdError;
                setNewPassword('');
                setConfirmPassword('');
                setMessage({ text: 'Profile and password updated successfully!', type: 'success' });
            }

        } catch (error: any) {
            setMessage({ text: error.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-surface text-surface-on font-sans">
            {/* Nav */}
            <nav className="border-b border-outline/10 bg-surface-container-low/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 text-primary font-medium hover:bg-primary/5 px-4 py-2 rounded-full transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                    <span className="text-xl font-bold">Profile Info</span>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="animate-fade-in space-y-8">
                    {/* Hero Section */}
                    <div className="flex flex-col md:flex-row items-center gap-8 bg-surface-container-low p-8 rounded-[32px] border border-outline/5 transition-all hover:shadow-m3-2">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-surface-container-highest border-4 border-primary/10 shadow-m3-1">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary/30">
                                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-primary-on rounded-xl flex items-center justify-center cursor-pointer shadow-m3-2 hover:scale-110 active:scale-95 transition-all">
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                                {uploading ? (
                                    <div className="w-4 h-4 border-2 border-primary-on border-t-transparent animate-spin rounded-full"></div>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </label>
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-bold mb-1">{username || 'User Profile'}</h2>
                            <p className="text-surface-onVariant">{email}</p>
                            <div className="mt-4 inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20">
                                Authenticated Member
                            </div>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-slide-up ${message.type === 'error' ? 'bg-error/10 text-error border border-error/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {message.type === 'error' ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                )}
                            </svg>
                            <p className="text-sm font-medium">{message.text}</p>
                        </div>
                    )}

                    <form onSubmit={handleSaveProfile} className="grid md:grid-cols-2 gap-8">
                        {/* Account Settings */}
                        <div className="m3-card p-6 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="p-2 bg-primary/10 text-primary rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </span>
                                <h3 className="text-lg font-bold">Account Basics</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Display Name</label>
                                    <input
                                        type="text"
                                        className="m3-input"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Username"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        className="m3-input"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="Email"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="m3-card p-6 space-y-6">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="p-2 bg-error/10 text-error rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                                <h3 className="text-lg font-bold">Security</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">New Password</label>
                                    <input
                                        type="password"
                                        className="m3-input"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Leave blank to keep current"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="m3-input"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Enter again"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="m3-card p-6 space-y-6 md:col-span-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="p-2 bg-primary/10 text-primary rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </span>
                                <h3 className="text-lg font-bold">Preferences</h3>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-outline/5">
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-bold">Email Alerts</div>
                                        <div className="text-[10px] text-surface-onVariant uppercase tracking-widest">Meeting invites</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setNotifEmail(!notifEmail)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${notifEmail ? 'bg-primary' : 'bg-surface-container-highest'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifEmail ? 'right-1' : 'left-1 shadow-sm'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-outline/5">
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-bold">Push Notifications</div>
                                        <div className="text-[10px] text-surface-onVariant uppercase tracking-widest">Real-time alerts</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setNotifPush(!notifPush)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${notifPush ? 'bg-primary' : 'bg-surface-container-highest'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifPush ? 'right-1' : 'left-1 shadow-sm'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl border border-outline/5">
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-bold">Meeting Reminders</div>
                                        <div className="text-[10px] text-surface-onVariant uppercase tracking-widest">Upcoming calls</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setNotifReminders(!notifReminders)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${notifReminders ? 'bg-primary' : 'bg-surface-container-highest'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifReminders ? 'right-1' : 'left-1 shadow-sm'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className={`m3-button-filled min-w-[200px] h-14 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {saving ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-primary-on border-t-transparent animate-spin rounded-full"></div>
                                        Updating...
                                    </div>
                                ) : 'Save All Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
