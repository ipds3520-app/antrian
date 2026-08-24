"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { data: session, isPending } = authClient.useSession()
    const router = useRouter()

    async function handleSignOut() {
        await authClient.signOut()
        window.location.assign("/auth/login")
    }

    useEffect(() => {
        if (!isPending && !session) {
            router.push("/auth/login")
        }
    }, [isPending, session, router])

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground">Memuat...</p>
            </div>
        )
    }

    if (!session) {
        return null
    }

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b bg-background">
                <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
                    <h1 className="text-lg font-semibold">Antrian</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                            {session.user.name}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSignOut}
                        >
                            <LogOut className="h-4 w-4" />
                            Keluar
                        </Button>
                    </div>
                </div>
            </header>
            <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
                {children}
            </main>
        </div>
    )
}
