import { fail, ok, withUser } from "@/lib/api"
import { updateUserProfile } from "@/lib/session"
import { isValidPhone, normalizePhone } from "@/lib/validation"

export async function GET(request: Request) {
    return withUser(request, async (user) => {
        return ok({
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
        })
    })
}

export async function PATCH(request: Request) {
    return withUser(request, async (user) => {
        const body = (await request.json().catch(() => null)) as {
            name?: unknown
            phone?: unknown
        } | null

        const name = typeof body?.name === "string" ? body.name.trim() : ""
        const phone = normalizePhone(body?.phone)

        if (name.length < 2 || name.length > 120) {
            return fail(
                "Nama harus diisi (2-120 karakter)",
                400,
                "INVALID_INPUT",
            )
        }
        if (!isValidPhone(phone)) {
            return fail(
                "Nomor WhatsApp tidak valid (contoh: 081234567890)",
                400,
                "INVALID_INPUT",
            )
        }

        const updated = await updateUserProfile(user.id, { name, phone })
        if (!updated) {
            return fail("Pengguna tidak ditemukan", 404, "NOT_FOUND")
        }

        return ok(updated)
    })
}
