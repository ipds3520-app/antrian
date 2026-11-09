import { cookies } from "next/headers"
import {
    createSessionToken,
    getSessionExpiresAt,
    getTokenFromCookieHeader,
    SESSION_COOKIE,
    verifySessionToken,
} from "@/lib/auth"
import { verifyPassword } from "@/lib/password"
import { getSupabaseClient } from "@/lib/supabase"
import type { AuthUser, UserRow } from "@/lib/types"
import { displayNameFromEmail, normalizeEmail } from "@/lib/validation"

export type { UserRow }

export function isAdminRole(role: string | null): boolean {
    return role?.toLowerCase() === "admin"
}

function normalizeRole(role: string | null): AuthUser["role"] {
    return isAdminRole(role) ? "admin" : "user"
}

export function toAuthUser(row: UserRow): AuthUser {
    return {
        id: String(row.id),
        email: row.email,
        name: row.name || displayNameFromEmail(row.email),
        role: normalizeRole(row.role),
        phone: row.phone,
    }
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) return null

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .ilike("email", normalizedEmail)
        .maybeSingle()

    if (error) {
        console.error("[session] gagal mencari user by email", error.message)
        return null
    }

    return (data as UserRow) ?? null
}

export async function findUserById(id: string): Promise<UserRow | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle()

    if (error) {
        console.error("[session] gagal mencari user by id", error.message)
        return null
    }

    return (data as UserRow) ?? null
}

/**
 * Creates a regular user account with an app-managed bcrypt password.
 */
export async function createUserAccount(input: {
    name: string
    email: string
    phone: string
    passwordHash: string
}): Promise<UserRow> {
    const supabase = getSupabaseClient()
    const newUser: Omit<UserRow, "id"> = {
        email: normalizeEmail(input.email),
        name: input.name,
        role: "user",
        password: input.passwordHash,
        phone: input.phone || null,
        created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
        .from("users")
        .insert(newUser)
        .select()
        .single()

    if (error) {
        // A concurrent signup may have created the same email first.
        const raced = await findUserByEmail(newUser.email)
        if (raced) {
            throw new Error("EMAIL_TAKEN")
        }

        throw new Error(`Gagal membuat pengguna: ${error.message}`)
    }

    return data as UserRow
}

export async function authenticateUser(
    email: string,
    password: string,
): Promise<AuthUser | null> {
    const row = await findUserByEmail(email)
    if (!row) return null
    if (normalizeRole(row.role) !== "user") return null
    if (!row.password) return null

    const valid = await verifyPassword(password, row.password)
    return valid ? toAuthUser(row) : null
}

export async function updateUserProfile(
    id: string,
    input: { name: string; phone: string | null },
): Promise<AuthUser | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("users")
        .update({ name: input.name, phone: input.phone })
        .eq("id", id)
        .select()
        .maybeSingle()

    if (error) {
        throw new Error(`Gagal memperbarui profil: ${error.message}`)
    }

    return data ? toAuthUser(data as UserRow) : null
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
