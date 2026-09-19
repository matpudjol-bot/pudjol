const SUPABASE_URL = "https://mafgvpvmxuhsqclnzaoj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_un00tsFi5Q___HRyZldb6g_UUQ2rzcn";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);