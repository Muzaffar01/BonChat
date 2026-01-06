
const { createClient } = require('@supabase/supabase-js');
// using native fetch

const url = "https://xkolzhvwursbpfhbqwyo.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrb2x6aHZ3dXJzYnBmaGJxd3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MTkxMDQsImV4cCI6MjA4Mjk5NTEwNH0.fLEL_ZlWQ0ffWQVKJnl7HEGGcSs7PZADeJNLKPepBu8";

async function testConnection() {
    console.log("Testing connection to:", url);
    try {
        const response = await fetch(url + '/auth/v1/health');
        console.log("Health check status:", response.status);
        console.log("Health check text:", await response.text());
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testConnection();
