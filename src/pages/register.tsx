import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { saveUser, User } from '@/lib/users';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [existingUserId, setExistingUserId] = useState<string | null>(null);

    const { login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (router.query.username) setUsername(router.query.username as string);
        if (router.query.id) {
            setExistingUserId(router.query.id as string);
        }
        if (router.query.email) {
            setEmail(router.query.email as string);
        }
    }, [router.query]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setVerifying(true);

        if (!username) { setVerifying(false); return setError("Username required"); }
        if (!email) { setVerifying(false); return setError("Email required"); }

        try {
            let userId = existingUserId;

            if (!userId) {
                if (!password) { setVerifying(false); return setError("Password required"); }

                console.log("Signing up with password...");
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username }
                    }
                });

                if (signUpError) throw signUpError;
                if (!data.user) throw new Error("Registration failed - no user returned");

                if (!data.session) {
                    setError("Confirmation email sent! Please check your inbox before logging in.");
                    setVerifying(false);
                    return;
                }

                userId = data.user.id;
            }

            const userProfile: User = {
                id: userId!,
                username,
                email,
            };

            await saveUser(userProfile);

            login({
                id: userProfile.id,
                username: userProfile.username,
                email: userProfile.email
            });

            router.push('/');
        } catch (err: any) {
            console.error("Registration error:", err);
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface relative overflow-hidden">
            <main className="w-full max-w-[480px] z-10 animate-fade-in">
                <div className="mb-12 text-center">
                    <div className="w-16 h-16 bg-primary-container text-primary-onContainer rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-m3-1">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-surface-on">
                        BonChat
                    </h1>
                </div>

                <div className="m3-card p-8 md:p-10">
                    <h2 className="text-2xl font-medium text-surface-on mb-1 text-center">
                        {existingUserId ? 'Complete Profile' : 'Create Account'}
                    </h2>
                    <p className="text-surface-onVariant text-center mb-8 text-sm">
                        {existingUserId ? 'Last step before you start chatting' : 'Join thousand of users chatting daily'}
                    </p>

                    <form onSubmit={handleRegister} className="space-y-6">
                        {error && (
                            <div className={`p-4 ${error.includes("email sent") ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-error text-on-error'} rounded-xl text-sm py-3 text-center mb-4`}>
                                {error}
                                <div className="mt-2 text-xs opacity-75 font-mono text-left">
                                    Debug: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'URL Loaded' : 'URL Missing'}
                                    <br />
                                    Error Details: {JSON.stringify(error, Object.getOwnPropertyNames(error))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-primary ml-1 uppercase tracking-wider">Username</label>
                            <input
                                type="text"
                                placeholder="What should we call you?"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="m3-input"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-primary ml-1 uppercase tracking-wider">Email Address</label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`m3-input ${existingUserId ? 'opacity-40 cursor-not-allowed' : ''}`}
                                required
                                disabled={!!existingUserId}
                            />
                        </div>

                        {!existingUserId && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-primary ml-1 uppercase tracking-wider">Password</label>
                                <input
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="m3-input"
                                    required
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="m3-button-filled w-full mt-6 flex items-center justify-center gap-2 h-14"
                            disabled={verifying}
                        >
                            {verifying ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : existingUserId ? 'Save Profile' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-outline/10 text-center">
                        <p className="text-surface-onVariant text-sm mb-4">Already have an account?</p>
                        <Link href="/login">
                            <button className="m3-button-tonal w-full">Login Here</button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
