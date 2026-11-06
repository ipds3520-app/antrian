import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { getCurrentUser } from "@/lib/session"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()

    if (!user) redirect("/auth/admin")
    if (user.role !== "admin") redirect("/user")

    return (
        <div className="flex min-h-screen flex-col">
            <AppHeader
                title="Antrian Admin"
                subtitle="Kelola seluruh appointment"
                userName={user.name}
                homeHref="/admin/dashboard"
                logoutTo="/auth/admin"
                links={[
                    { href: "/admin/dashboard", label: "Appointment" },
                    { href: "/admin/reports", label: "Laporan" },
                ]}
            />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
                {children}
            </main>
        </div>
    )
}
