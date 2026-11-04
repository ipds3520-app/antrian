import { NextResponse } from "next/server"
import { fail, ok } from "@/lib/api"
import { setSessionCookie } from "@/lib/auth"
import { verifyMagicLink } from "@/lib/magic-link"
import { isSupabaseOtpType, type SupabaseOtpType } from "@/lib/supabase"
import { getBaseUrl, sanitizeRedirect } from "@/lib/url"

function wantsJson(request: Request, url: URL): boolean {
    return (
        url.searchParams.get("format") === "json" ||
        request.headers.get("accept")?.includes("application/json") === true
    )
}

function readOtpType(value: string | null): SupabaseOtpType {
    return value && isSupabaseOtpType(value) ? value : "email"
}

export async function GET(request: Request) {
    const url = new URL(request.url)
    const tokenHash = url.searchParams.get("token_hash") ?? ""
    const type = readOtpType(url.searchParams.get("type"))
    const asJson = wantsJson(request, url)

    if (!tokenHash) {
        if (asJson) return fail("Token tidak ditemukan", 400, "INVALID_TOKEN")
        return NextResponse.redirect(
            new URL("/auth/login?error=invalid", getBaseUrl(request)),
        )
    }

    const session = await verifyMagicLink(tokenHash, type)

    if (!session) {
        if (asJson)
            return fail(
                "Tautan tidak valid atau sudah kedaluwarsa",
                401,
                "INVALID_TOKEN",
            )
        return NextResponse.redirect(
            new URL("/auth/login?error=expired", getBaseUrl(request)),
        )
    }

    if (asJson) {
        const response = ok(session)
        return setSessionCookie(response, session.token)
    }

    const fallback =
        session.user.role === "admin" ? "/admin/dashboard" : "/user"
    const redirectTo = sanitizeRedirect(
        url.searchParams.get("redirect"),
        fallback,
    )

    const response = NextResponse.redirect(
        new URL(redirectTo, getBaseUrl(request)),
    )
    return setSessionCookie(response, session.token)
}

export async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as {
        token_hash?: unknown
        type?: unknown
        token?: unknown
    } | null

    const tokenHash =
        typeof body?.token_hash === "string"
            ? body.token_hash
            : typeof body?.token === "string"
              ? body.token
              : ""
    const type = readOtpType(typeof body?.type === "string" ? body.type : null)

    if (!tokenHash) return fail("Token tidak ditemukan", 400, "INVALID_TOKEN")

    const session = await verifyMagicLink(tokenHash, type)
    if (!session) {
        return fail(
            "Tautan tidak valid atau sudah kedaluwarsa",
            401,
            "INVALID_TOKEN",
        )
    }

    const response = ok(session)
    return setSessionCookie(response, session.token)
}
