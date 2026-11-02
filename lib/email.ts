import { createSupabaseAuthClient } from "@/lib/supabase"

interface SendEmailResult {
    sent: boolean
    error?: string
}

/**
 * Asks Supabase Auth to send its Magic Link email. The email template must
 * point at `/api/auth/verify` with `{{ .TokenHash }}` so this app can verify
 * the token on the server. See README for the exact template.
 */
export async function sendMagicLinkEmail(to: string): Promise<SendEmailResult> {
    try {
        const supabase = createSupabaseAuthClient()
        const { error } = await supabase.auth.signInWithOtp({
            email: to,
            options: {
                shouldCreateUser: true,
            },
        })

        if (error) {
            console.error("[email] gagal mengirim magic link", error.message)
            return { sent: false, error: error.message }
        }

        return { sent: true }
    } catch (error) {
        console.error("[email] gagal mengirim magic link", error)
        return {
            sent: false,
            error:
                error instanceof Error
                    ? error.message
                    : "Email provider belum dikonfigurasi",
        }
    }
}
