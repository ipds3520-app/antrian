"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"

export default function HomePage() {
    const { data: session, isPending } = authClient.useSession()
    const router = useRouter()

    useEffect(() => {
        if (isPending) return
        if (!session) {
            router.push("/auth/login")
            return
        }
        router.push("/admin/dashboard")
    }, [session, isPending, router])

    return null
}
