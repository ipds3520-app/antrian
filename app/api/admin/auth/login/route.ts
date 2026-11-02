import { fail, ok } from "@/lib/api"
import { setSessionCookie } from "@/lib/auth"
import { authenticateAdmin, issueSession } from "@/lib/session"
import { isValidEmail, normalizeEmail } from "@/lib/validation"

export async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as {
        email?: unknown
        password?: unknown
    } | null

    const email = normalizeEmail(body?.email)
    const password = typeof body?.password === "string" ? body.password : ""

    if (!isValidEmail(email) || !password) {
        return fail("Email dan password wajib diisi", 400, "INVALID_INPUT")
    }

    const user = await authenticateAdmin(email, password)
    if (!user) {
        return fail("Email atau password salah", 401, "INVALID_CREDENTIALS")
    }

    const session = issueSession(user)
    const response = ok(session)
    return setSessionCookie(response, session.token)
}
