import { type NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth-guard"

export async function handleAdmin(request: NextRequest) {
    const user = await getUser(request)

    if (!user) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 },
        )
    }

    if (user.role !== "admin") {
        return NextResponse.json(
            { success: false, message: "Forbidden" },
            { status: 403 },
        )
    }

    const headers = new Headers(request.headers)
    headers.set("x-user-id", String(user.id))
    headers.set("x-user-role", user.role)

    return NextResponse.next({ request: { headers } })
}
