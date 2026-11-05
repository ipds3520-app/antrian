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
                .from("appointments")
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
    const body = await request.json();
    const supabase = getSupabaseClient();

    const {
      name,
      email,
      booked_date,
      time,
      service,
      phone
    } = body;

    // Validate required fields
    if (!booked_date || !time) {
      return Response.json(
        {
          success: false,
          message: "booked_date and time are required",
        },
        { status: 400 }
      );
    }

    // Validate date format
    if (
      typeof booked_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(booked_date)
    ) {
      return Response.json(
        {
          success: false,
          message: "Invalid booked_date format",
        },
        { status: 400 }
      );
    }

    // Get timezone from environment
    const timezone =
      process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Jakarta";

    // Get the next queue number for the booked date
    const { data: latestAppointment, error: fetchError } =
      await supabase
        .from("appointments")
        .select("queue_number")
        .eq("booked_date", booked_date)
        .order("queue_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (fetchError) {
      console.error("Fetch error:", JSON.stringify(fetchError, null, 2));
      throw fetchError;
    }

    const nextQueueNumber =
      Number(latestAppointment?.queue_number ?? 0) + 1;

    // Insert appointment
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        name,
        email,
        booked_date,
        time,
        service,
        phone,
        queue_number: nextQueueNumber,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", JSON.stringify(error, null, 2));
      throw error;
    }

    return Response.json(
      {
        success: true,
        message: "Appointment created successfully",
        data,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Appointment POST error:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to create appointment",
        error: JSON.stringify(error, Object.getOwnPropertyNames(error as object)),
      },
      { status: 500 }
    );
  }
}
