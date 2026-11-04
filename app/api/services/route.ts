import { NextResponse } from "next/server"
import { SERVICES, TIME_SLOTS } from "@/lib/antrian"

export async function GET() {
    return NextResponse.json({
        data: {
            services: SERVICES,
            timeSlots: TIME_SLOTS,
        },
    })
}
