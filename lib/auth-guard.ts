import type { NextRequest } from "next/server"
import { type TokenPayload, verifyToken } from "./auth"

export async function getUser(
    request: NextRequest,
): Promise<TokenPayload | null> {
    const header = request.headers.get("Authorization")
    if (!header?.startsWith("Bearer ")) return null

    const token = header.substring(7)
    try {
        return await verifyToken(token)
    } catch {
        return null
    }
}

export async function requireAuth(request: NextRequest): Promise<TokenPayload> {
    const user = await getUser(request)
    if (!user) {
        throw new Error("UNAUTHORIZED")
    }
    return user
}

export async function requireRole(
    request: NextRequest,
    role: "client" | "admin",
): Promise<TokenPayload> {
    const user = await requireAuth(request)
    if (user.role !== role) {
        throw new Error("FORBIDDEN")
    }
    return user
}
