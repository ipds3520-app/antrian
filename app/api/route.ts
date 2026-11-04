import { randomUUID } from "node:crypto"
import { toDateKey } from "@/lib/antrian"
import { getSupabaseClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const supabase = getSupabaseClient()
        const today = toDateKey(new Date())

        let { data, error } = await supabase
            .from("appointments")
            .select("*")
            .eq("booked_date", today)
            .order("queue_number", { ascending: true, nullsFirst: false })
            .order("time", { ascending: true })

        // Fallback to "appointment" (singular) if "appointments" (plural) relation doesn't exist
        if (error) {
            const fallback = await supabase
                .from("appointment")
                .select("*")
                .eq("booked_date", today)
                .order("queue_number", { ascending: true, nullsFirst: false })
                .order("time", { ascending: true })

            if (!fallback.error) {
                data = fallback.data
                error = null
            }
        }

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

export async function POST(request: Request) {
    try {
        const supabase = getSupabaseClient()

        const body = await request.json().catch(() => null)
        if (!body || typeof body !== "object") {
            return Response.json({ error: "Body tidak valid" }, { status: 400 })
        }

        const record = body as Record<string, unknown>
        const name = typeof record.name === "string" ? record.name.trim() : ""
        const email =
            typeof record.email === "string" ? record.email.trim() : ""
        const phone =
            typeof record.phone === "string" ? record.phone.trim() : ""
        const bookedDate =
            typeof record.booked_date === "string"
                ? record.booked_date
                : typeof record.bookedDate === "string"
                  ? record.bookedDate
                  : ""
        const time = typeof record.time === "string" ? record.time : ""
        const service = typeof record.service === "string" ? record.service : ""
        const queueNumber = record.queue_number ?? record.queueNumber

        if (!name || !email || !bookedDate || !time || !service) {
            return Response.json(
                { error: "Field wajib tidak lengkap" },
                { status: 400 },
            )
        }

        const insertData: Record<string, unknown> = {
            id: randomUUID(),
            created_at: new Date().toISOString(),
            name,
            email,
            booked_date: bookedDate,
            time,
            service,
            phone: phone || null,
        }

        if (
            queueNumber !== undefined &&
            queueNumber !== null &&
            queueNumber !== ""
        ) {
            insertData.queue_number = queueNumber
        }

        let { data, error } = await supabase
            .from("appointments")
            .insert(insertData)
            .select()
            .single()

        if (error) {
            const fallback = await supabase
                .from("appointment")
                .insert(insertData)
                .select()
                .single()

            if (!fallback.error) {
                data = fallback.data
                error = null
            }
        }

        if (error) {
            console.error("[api/root] gagal menambahkan appointments", error)
            return Response.json({ error: error.message }, { status: 500 })
        }

        return Response.json({ appointments: data }, { status: 201 })
    } catch (err) {
        console.error("[api/root] unhandled POST error", err)
        return Response.json(
            { error: "Terjadi kesalahan server" },
            { status: 500 },
        )
    }
}
