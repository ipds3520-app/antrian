import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import type { AuthUser } from "@/lib/types"

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
    return NextResponse.json({ data }, init)
}

export function fail(
    message: string,
    status = 400,
    code?: string,
): NextResponse {
    return NextResponse.json(code ? { message, code } : { message }, { status })
}

export async function withUser(
    request: Request,
    handler: (user: AuthUser) => Promise<NextResponse>,
): Promise<NextResponse> {
    const user = await getSessionFromRequest(request)
    if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED")

    try {
        return await handler(user)
    } catch (error) {
        console.error("[api] unhandled error", error)
        return fail("Terjadi kesalahan pada server", 500, "INTERNAL_ERROR")
    }
}

export async function withAdmin(
    request: Request,
    handler: (user: AuthUser) => Promise<NextResponse>,
): Promise<NextResponse> {
    const user = await getSessionFromRequest(request)
    if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED")
    if (user.role !== "admin") {
        return fail("Forbidden", 403, "FORBIDDEN")
    }

    try {
        return await handler(user)
    } catch (error) {
        console.error("[api] unhandled error", error)
        return fail("Terjadi kesalahan pada server", 500, "INTERNAL_ERROR")
    }
}
