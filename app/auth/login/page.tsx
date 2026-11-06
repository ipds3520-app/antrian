import { redirect } from "next/navigation"
import { UserLoginForm } from "@/components/user-login-form"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
    const user = await getCurrentUser()

    if (user) {
        redirect(user.role === "admin" ? "/admin/dashboard" : "/user")
    }

    return <UserLoginForm />
}
