import { createClient } from "@supabase/supabase-js"

function readSupabaseEnv(): { url: string; key: string } {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        throw new Error(
            "NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY wajib diatur",
        )
    }

    return { url, key }
}

/**
 * Server-side Supabase client used for database operations.
 * Operates using publishable/anon key without bypassing RLS.
 */
export function getSupabaseClient() {
    const { url, key } = readSupabaseEnv()

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    })
}
