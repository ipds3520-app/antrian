import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { getCurrentUser } from "@/lib/session"

export default async function UserLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()

    if (!user) redirect("/auth/login")
    if (user.role === "admin") redirect("/admin/dashboard")

    return (
        <div className="flex min-h-screen flex-col">
            <AppHeader
                title="Antrian BPS"
                subtitle="Pemesanan antrian online"
                userName={user.name}
                homeHref="/user"
                logoutTo="/auth/login"
            />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
                {children}
            </main>
        </div>
    )
}
