"use client"

import { LogOut } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function AppHeader({
    title,
    subtitle,
    userName,
    homeHref,
    logoutTo,
}: {
    title: string
    subtitle?: string
    userName: string
    homeHref: string
    logoutTo: string
}) {
    async function handleSignOut() {
        await fetch("/api/auth/session", { method: "DELETE" }).catch(() => null)
        window.location.assign(logoutTo)
    }

    return (
        <header className="border-b bg-background">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <div>
                    <Link href={homeHref} className="text-lg font-semibold">
                        {title}
                    </Link>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <span className="hidden text-sm text-muted-foreground sm:inline">
                        {userName}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                        <LogOut className="h-4 w-4" />
                        Keluar
                    </Button>
                </div>
            </div>
        </header>
    )
}
