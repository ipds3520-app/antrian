// request supabase to get all appointment on today()
// return all appointments
// return response {appointments}

import { createClient } from "@supabase/supabase-js"
import { toDateKey } from "@/lib/antrian"

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        return Response.json({ appointments: [] }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const today = toDateKey(new Date())

    const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("booked_date", today)

    if (error) {
        console.error("[api/root] gagal mengambil appointment hari ini", error)
        return Response.json({ appointments: [] }, { status: 500 })
    }

    return Response.json({ appointments: data ?? [] })
}
