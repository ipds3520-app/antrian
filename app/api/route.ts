import { toDateKey } from "@/lib/antrian"
import { getSupabaseClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const supabase = getSupabaseClient()
        const today = toDateKey(new Date())

        const { data, error } = await supabase
            .from("appointments")
            .select("*")
            .eq("booked_date", today)
            .order("queue_number", { ascending: true, nullsFirst: false })
            .order("time", { ascending: true })

        if (error) {
            console.error(
                "[api/root] gagal mengambil appointment hari ini",
                error,
            )
            return Response.json({ appointments: [] }, { status: 500 })
        }

        return Response.json({ appointments: data ?? [], today })
    } catch (err) {
        console.error("[api/root] unhandled error", err)
        return Response.json({ appointments: [] }, { status: 500 })
    }
}
