import {
    findOrCreateUserByEmail,
    findUserByEmail,
    isAdminRole,
    issueSession,
    toAuthUser,
} from "@/lib/session"
import { type SupabaseOtpType, verifySupabaseOtp } from "@/lib/supabase"

export async function verifyMagicLink(
    tokenHash: string,
    type: SupabaseOtpType = "email",
) {
    if (!tokenHash) return null

    const email = await verifySupabaseOtp(tokenHash, type)
    if (!email) return null

    const existing = await findUserByEmail(email)

    // Admin accounts must authenticate with email + password. Never turn a
    // magic link into an admin session.
    if (existing && isAdminRole(existing.role)) return null

    const row = existing ?? (await findOrCreateUserByEmail(email))
    const user = toAuthUser(row)

    return issueSession(user)
}
