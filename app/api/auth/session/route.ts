import { fail, ok } from "@/lib/api"
import { clearSessionCookie } from "@/lib/auth"
import { getSessionFromRequest } from "@/lib/session"

export async function GET(request: Request) {
    const user = await getSessionFromRequest(request)
    if (!user) return fail("Unauthorized", 401, "UNAUTHORIZED")

    return ok({ user })
}

export async function DELETE() {
    return clearSessionCookie(ok({ message: "Berhasil keluar" }))
}
