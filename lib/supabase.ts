import { createClient } from "@supabase/supabase-js"

export const SUPABASE_OTP_TYPES = ["email", "magiclink", "signup"] as const

export type SupabaseOtpType = (typeof SUPABASE_OTP_TYPES)[number]

export function isSupabaseOtpType(value: string): value is SupabaseOtpType {
    return (SUPABASE_OTP_TYPES as readonly string[]).includes(value)
}

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
 * Server-side Supabase client used only for Auth (sending magic links and
 * verifying the token hash from the email). It never persists a session.
 */
export function createSupabaseAuthClient() {
    const { url, key } = readSupabaseEnv()

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    })
}

export async function verifySupabaseOtp(
    tokenHash: string,
    type: SupabaseOtpType = "email",
): Promise<string | null> {
    try {
        const supabase = createSupabaseAuthClient()
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
        })

        if (error) {
            console.error("[supabase] gagal verifikasi OTP", error.message)
            return null
        }

        return data.user?.email ?? null
    } catch (error) {
        console.error("[supabase] gagal verifikasi OTP", error)
        return null
    }
}
