"use client"

import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-muted/40">
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm px-4">{children}</div>
        </div>
    )
}
