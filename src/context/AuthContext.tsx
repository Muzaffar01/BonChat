import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { findUserById } from '@/lib/users';

interface User {
    id: string;
    username: string;
    email?: string;
    phoneNumber?: string;
    avatar_url?: string;
    notification_settings?: {
        email: boolean;
        push: boolean;
        meeting_reminders: boolean;
    };
}

interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => { },
    logout: () => { },
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check active session
        const checkSession = async () => {
            // Check for errors in URL (Supabase returns errors in hash)
            if (window.location.hash.includes('error=')) {
                console.error("Auth error found in URL hash:", window.location.hash);
            }

            const start = Date.now();
            console.log("Checking Supabase session...");
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                console.log("Session found, fetching profile...");
                const profile = await findUserById(session.user.id);
                if (profile) {
                    setUser({
                        id: profile.id,
                        username: profile.username,
                        email: profile.email,
                        phoneNumber: profile.phoneNumber,
                        avatar_url: profile.avatar_url,
                        notification_settings: profile.notification_settings
                    });
                }
            }
            console.log(`Initial session check took ${Date.now() - start}ms`);
            setLoading(false);
        };

        checkSession();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth state change event:", event);
            if (session?.user) {
                const profile = await findUserById(session.user.id);
                if (profile) {
                    setUser({
                        id: profile.id,
                        username: profile.username,
                        email: profile.email,
                        phoneNumber: profile.phoneNumber,
                        avatar_url: profile.avatar_url,
                        notification_settings: profile.notification_settings
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = (userData: User) => {
        // Manual override if needed, but listener usually handles it
        setUser(userData);
        router.push('/');
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
