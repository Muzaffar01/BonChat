import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { findUserById } from '@/lib/users';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);

    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setVerifying(true);

        if (!email || !password) {
            setVerifying(false);
            return setError("Email and Password required");
        }

        try {
            console.log("Logging in with password...");
            const { data, error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (loginError) throw loginError;
            if (!data.user) throw new Error("Login failed");

            const profile = await findUserById(data.user.id);

            if (profile) {
                login(profile);
                const returnUrl = router.query.redirect as string || '/';
                router.push(returnUrl);
            } else {
                router.push({
                    pathname: '/register',
                    query: {
                        email: data.user.email,
                        id: data.user.id,
                    }
                });
            }
        } catch (err: any) {
            console.error("Login error:", err);
            if (err.message === 'Invalid login credentials') {
                setError("Invalid email or password. Don't have an account?");
            } else {
                setError(err.message);
            }
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface relative overflow-hidden">
            <main className="w-full max-w-[440px] z-10 animate-fade-in">
                <div className="mb-12 text-center">
                    <div className="w-16 h-16 bg-primary-container text-primary-onContainer rounded-[24px] flex items-center justify-center mx-auto mb-4 shadow-m3-1">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-surface-on">
                        BonChat
                    </h1>
                </div>

                <div className="m3-card p-8 md:p-10">
                    <h2 className="text-2xl font-medium text-surface-on mb-1 text-center">Login</h2>
                    <p className="text-surface-onVariant text-center mb-8 text-sm">Welcome back to the conversation</p>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-error text-on-error rounded-xl text-sm py-3 text-center mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-primary ml-1 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="m3-input"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-primary ml-1 uppercase tracking-wider">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="m3-input"
                                required
                            />
                        </div>

                        <div className="flex justify-end pt-1">
                            <a href="#" className="text-sm font-medium text-primary hover:underline transition-colors">Forgot Password?</a>
                        </div>

                        <button
                            type="submit"
                            className="m3-button-filled w-full mt-4 flex items-center justify-center gap-2 h-14"
                            disabled={verifying}
                        >
                            {verifying ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </>
                            ) : 'Login'}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-outline/10 text-center">
                        <p className="text-surface-onVariant text-sm mb-4">Don't have an account?</p>
                        <Link href="/register">
                            <button className="m3-button-tonal w-full">Create Account</button>
                        </Link>
                    </div>
                </div>

                <p className="mt-12 text-surface-onVariant text-xs text-center">
                    © 2026 BonChat • Material Design 3
                </p>
            </main>
        </div>
    );
}
