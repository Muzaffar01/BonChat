import { supabase } from './supabase';

export interface User {
    id: string; // auth.users.id
    username: string;
    email?: string;
    phoneNumber?: string;
    avatar_url?: string;
    notification_settings?: {
        email: boolean;
        push: boolean;
        meeting_reminders: boolean;
    };
    created_at?: string;
}

export async function getUsers(): Promise<User[]> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;
        return data || [];
    } catch (e) {
        return [];
    }
}

export async function saveUser(user: User): Promise<User> {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        // Silent failure or throw? User requested removal of logs.
    }

    try {
        // Upsert user profile
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data: { session } } = await supabase.auth.getSession();

        // Add a timeout to the database call
        const dbPromise = supabase
            .from('users')
            .upsert({
                id: user.id,
                username: user.username,
                email: user.email,
                phone_number: user.phoneNumber,
                avatar_url: user.avatar_url,
                notification_settings: user.notification_settings
            })
            .select()
            .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database operation timed out after 10s")), 10000)
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await Promise.race([dbPromise, timeoutPromise]) as any;

        if (error) {
            throw error;
        }

        // Return mapped user
        return {
            id: data.id,
            username: data.username,
            email: data.email,
            phoneNumber: data.phone_number,
            avatar_url: data.avatar_url,
            notification_settings: data.notification_settings
        };
    } catch (e) {
        throw e;
    }
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'
        if (!data) return undefined;

        return {
            id: data.id,
            username: data.username,
            email: data.email,
            phoneNumber: data.phone_number,
            avatar_url: data.avatar_url,
            notification_settings: data.notification_settings
        };
    } catch (e) {
        return undefined;
    }
}


export async function findUserById(id: string): Promise<User | undefined> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return undefined;

        return {
            id: data.id,
            username: data.username,
            email: data.email,
            phoneNumber: data.phone_number,
            avatar_url: data.avatar_url,
            notification_settings: data.notification_settings
        };
    } catch (e) {
        return undefined;
    }
}
