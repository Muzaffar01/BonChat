import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate URL (must start with http/https)
const isValidUrl = (url: string | undefined) => url?.startsWith('http') || url?.startsWith('https');

// Use placeholder if env var is missing or invalid (e.g. "YOUR_SUPABASE_URL")
const urlToUse = isValidUrl(supabaseUrl) ? supabaseUrl! : 'https://placeholder.supabase.co';
const keyToUse = supabaseAnonKey || 'placeholder';

if (!isValidUrl(supabaseUrl)) {
    console.warn("WARNING: Invalid or missing NEXT_PUBLIC_SUPABASE_URL. Using placeholder. Please update .env.local");
} else {
    console.log("Supabase client initialized with URL:", supabaseUrl);
}

export const supabase = createClient(urlToUse, keyToUse);
