import { timingSafeEqual } from "node:crypto"
import { hash } from "bcryptjs"

const BCRYPT_PATTERN = /^\$2[aby]\$/

/**
 * Supports bcrypt hashes (the usual format used by Supabase/Postgres) and a
 * constant-time plaintext comparison for legacy rows.
 */
export async function verifyPassword(
    plainPassword: string,
    storedPassword: string,
): Promise<boolean> {
    if (BCRYPT_PATTERN.test(storedPassword)) {
        const { compare } = await import("bcryptjs")
        try {
            return await compare(plainPassword, storedPassword)
        } catch {
            return false
        }
    }

    const plainBuffer = Buffer.from(plainPassword, "utf8")
    const storedBuffer = Buffer.from(storedPassword, "utf8")

    if (plainBuffer.length !== storedBuffer.length) return false
    return timingSafeEqual(plainBuffer, storedBuffer)
}

export async function hashPassword(plainPassword: string): Promise<string> {
    return hash(plainPassword, 12)
}
