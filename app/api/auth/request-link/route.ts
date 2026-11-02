import { NextResponse } from "next/server"
import { fail } from "@/lib/api"
import { sendMagicLinkEmail } from "@/lib/email"
import { findUserByEmail, isAdminRole } from "@/lib/session"
import { isValidEmail, normalizeEmail } from "@/lib/validation"

export async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as {
        email?: unknown
    } | null
    const email = normalizeEmail(body?.email)

    if (!isValidEmail(email)) {
        return fail("Email tidak valid", 400, "INVALID_EMAIL")
    }

    const existing = await findUserByEmail(email)
    if (existing && isAdminRole(existing.role)) {
        return fail(
            "Akun admin harus masuk melalui halaman login admin dengan email dan password.",
            403,
            "ADMIN_USE_PASSWORD",
        )
    }

    const result = await sendMagicLinkEmail(email)

    if (!result.sent) {
        return fail(
            "Gagal mengirim email. Coba lagi beberapa saat lagi.",
            502,
            "EMAIL_FAILED",
        )
    }

    return NextResponse.json({
        message:
            "Tautan masuk telah dikirim. Buka email Anda untuk melanjutkan.",
        emailSent: true,
    })
}
