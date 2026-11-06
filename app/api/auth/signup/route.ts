import { fail, ok } from "@/lib/api"
import { hashPassword } from "@/lib/password"
import { createUserAccount, findUserByEmail } from "@/lib/session"
import {
    isValidEmail,
    isValidPhone,
    normalizeEmail,
    normalizePhone,
} from "@/lib/validation"

const MIN_PASSWORD_LENGTH = 8

export async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as {
        name?: unknown
        email?: unknown
        phone?: unknown
        password?: unknown
    } | null

    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const email = normalizeEmail(body?.email)
    const phone = normalizePhone(body?.phone)
    const password = typeof body?.password === "string" ? body.password : ""

    if (name.length < 2 || name.length > 120) {
        return fail("Nama harus diisi (2-120 karakter)", 400, "INVALID_INPUT")
    }
    if (!isValidEmail(email)) {
        return fail("Email tidak valid", 400, "INVALID_INPUT")
    }
    if (!isValidPhone(phone)) {
        return fail(
            "Nomor WhatsApp tidak valid (contoh: 081234567890)",
            400,
            "INVALID_INPUT",
        )
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        return fail(
            `Password minimal ${MIN_PASSWORD_LENGTH} karakter`,
            400,
            "INVALID_INPUT",
        )
    }

    const existing = await findUserByEmail(email)
    if (existing) {
        return fail("Email sudah terdaftar. Silakan masuk.", 409, "EMAIL_TAKEN")
    }

    const passwordHash = await hashPassword(password)

    try {
        const row = await createUserAccount({
            name,
            email,
            phone,
            passwordHash,
        })

        return ok(
            {
                user: {
                    id: row.id,
                    email: row.email,
                    name: row.name,
                    phone: row.phone,
                },
            },
            { status: 201 },
        )
    } catch (error) {
        if (error instanceof Error && error.message === "EMAIL_TAKEN") {
            return fail(
                "Email sudah terdaftar. Silakan masuk.",
                409,
                "EMAIL_TAKEN",
            )
        }

        throw error
    }
}
