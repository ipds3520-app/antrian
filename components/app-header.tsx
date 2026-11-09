"use client"

import { LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface AppHeaderLink {
    href: string
    label: string
}

export function AppHeader({
    title,
    subtitle,
    userName,
    homeHref,
    logoutTo,
    links = [],
}: {
    title: string
    subtitle?: string
    userName: string
    homeHref: string
    logoutTo: string
    links?: AppHeaderLink[]
}) {
    const pathname = usePathname()

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
            {links.length > 0 && (
                <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
                    {links.map((link) => {
                        const active =
                            pathname === link.href ||
                            pathname.startsWith(`${link.href}/`)

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                                    active
                                        ? "border-primary text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {link.label}
                            </Link>
                        )
                    })}
                </nav>
            )}
        </header>
    )
}
