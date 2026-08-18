import type { NextRequest } from "next/server"
import { handleAdmin } from "@/lib/middleware/admin"
import { handleClient } from "@/lib/middleware/client"

export default function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname

    if (path.startsWith("/api/admin")) {
        return handleAdmin(request)
    }

    if (path.startsWith("/api/v1")) {
        return handleClient(request)
    }
}

export const config = {
    matcher: ["/api/v1/:path*", "/api/admin/:path*"],
}
