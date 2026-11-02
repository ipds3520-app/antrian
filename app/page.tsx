import { QueueDashboard } from "@/components/queue-dashboard"
import { getCurrentUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function HomePage() {
    const user = await getCurrentUser()

    return <QueueDashboard currentUser={user} />
}
