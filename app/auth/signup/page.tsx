import { redirect } from "next/navigation"
import { UserSignupForm } from "@/components/user-signup-form"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function SignupPage() {
    const user = await getCurrentUser()

    if (user) {
        redirect(user.role === "admin" ? "/admin/dashboard" : "/user")
    }

    return <UserSignupForm />
}
