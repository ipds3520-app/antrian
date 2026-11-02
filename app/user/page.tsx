import { redirect } from "next/navigation"
import { UserDashboard } from "@/components/user-dashboard"
import { getCurrentUser } from "@/lib/session"

export default async function UserPage() {
    const user = await getCurrentUser()

    if (!user) redirect("/auth/login")
    if (user.role === "admin") redirect("/admin/dashboard")

    return (
        <UserDashboard
            user={{
                name: user.name,
                email: user.email,
                phone: user.phone ?? "",
            }}
        />
    )
}
