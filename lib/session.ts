import { randomUUID } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import { cookies } from "next/headers"
import {
    createSessionToken,
    getSessionExpiresAt,
    getTokenFromCookieHeader,
    SESSION_COOKIE,
    verifySessionToken,
} from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { verifyPassword } from "@/lib/password"
import type { AuthUser } from "@/lib/types"
import { displayNameFromEmail, normalizeEmail } from "@/lib/validation"

export type UserRow = typeof users.$inferSelect

export function isAdminRole(role: string | null): boolean {
    return role?.toLowerCase() === "admin"
}

function normalizeRole(role: string | null): AuthUser["role"] {
    return isAdminRole(role) ? "admin" : "user"
}

export function toAuthUser(row: UserRow): AuthUser {
    return {
        id: row.id,
        email: row.email,
        name: row.name || displayNameFromEmail(row.email),
        role: normalizeRole(row.role),
        phone: row.phone,
    }
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) return null

    const rows = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${normalizedEmail}`)
        .limit(1)

    return rows[0] ?? null
}

export async function findUserById(id: string): Promise<UserRow | null> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return rows[0] ?? null
}

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
    )
}

/**
 * Magic-link login creates the user row on first successful verification.
 */
export async function findOrCreateUserByEmail(email: string): Promise<UserRow> {
    const normalizedEmail = normalizeEmail(email)
    const existing = await findUserByEmail(normalizedEmail)
    if (existing) return existing

    try {
        const rows = await db
            .insert(users)
            .values({
                id: randomUUID(),
                email: normalizedEmail,
                name: displayNameFromEmail(normalizedEmail),
                role: "user",
                password: null,
                phone: null,
                createdAt: new Date(),
            })
            .returning()

        const created = rows[0]
        if (!created) throw new Error("Gagal membuat pengguna")
        return created
    } catch (error) {
        // Another verification request may have created the same email first.
        if (isUniqueViolation(error)) {
            const raced = await findUserByEmail(normalizedEmail)
            if (raced) return raced
        }

        throw error
    }
}

async function getUserFromToken(
    token: string | null,
): Promise<AuthUser | null> {
    if (!token) return null

    const payload = verifySessionToken(token)
    if (!payload) return null

    const row = await findUserById(payload.sub)
    return row ? toAuthUser(row) : null
}

export async function getSessionFromRequest(
    request: Request,
): Promise<AuthUser | null> {
    const authorization = request.headers.get("authorization")
    const bearer = authorization?.toLowerCase().startsWith("bearer ")
        ? authorization.slice(7).trim()
        : null
    const token =
        bearer ?? getTokenFromCookieHeader(request.headers.get("cookie"))

    return getUserFromToken(token)
}

export async function getCurrentUser(): Promise<AuthUser | null> {
    const token = (await cookies()).get(SESSION_COOKIE)?.value ?? null
    return getUserFromToken(token)
}

export function issueSession(user: AuthUser) {
    return {
        token: createSessionToken(user.id),
        expiresAt: getSessionExpiresAt(),
        user,
    }
}

export async function authenticateAdmin(
    email: string,
    password: string,
): Promise<AuthUser | null> {
    const row = await findUserByEmail(email)
    if (!row) return null
    if (normalizeRole(row.role) !== "admin") return null
    if (!row.password) return null

    const valid = await verifyPassword(password, row.password)
    return valid ? toAuthUser(row) : null
}
