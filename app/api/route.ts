// request supabase to get all appointment on today()
// return all appointments
// return response {appointments}

import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"
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
        .from("appointment")
        .select("*")
        .eq("booked_date", today)

    if (error) {
        console.error("[api/root] gagal mengambil appointment hari ini", error)
        return Response.json({ appointments: [] }, { status: 500 })
    }

    return Response.json({ appointments: data ?? [] })
}

export async function POST(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        return Response.json({ error: "Supabase tidak dikonfigurasi" }, { status: 500 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
        return Response.json({ error: "Body tidak valid" }, { status: 400 })
    }

    const record = body as Record<string, unknown>
    const name = typeof record.name === "string" ? record.name.trim() : ""
    const email = typeof record.email === "string" ? record.email.trim() : ""
    const phone = typeof record.phone === "string" ? record.phone.trim() : ""
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
        return Response.json({ error: "Field wajib tidak lengkap" }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

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

    if (queueNumber !== undefined && queueNumber !== null && queueNumber !== "") {
        insertData.queue_number = queueNumber
    }

    const { data, error } = await supabase
        .from("appointment")
        .insert(insertData)
        .select()
        .single()

    if (error) {
        console.error("[api/root] gagal menambahkan appointment", error)
        return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ appointment: data }, { status: 201 })
}
