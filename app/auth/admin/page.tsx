import { redirect } from "next/navigation"
import { AdminLoginForm } from "@/components/admin-login-form"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function AdminLoginPage() {
    const user = await getCurrentUser()

    if (user) {
        redirect(user.role === "admin" ? "/admin/dashboard" : "/user")
    }

    return <AdminLoginForm />
}
