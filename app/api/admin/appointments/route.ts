import { NextResponse } from "next/server"
import { isService } from "@/lib/antrian"
import { withAdmin } from "@/lib/api"
import { listAppointments } from "@/lib/appointments"

function positiveInt(value: string | null): number | undefined {
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
    return withAdmin(request, async () => {
        const params = new URL(request.url).searchParams
        const service = params.get("service")

        const result = await listAppointments({
            q: params.get("q") ?? undefined,
            date: params.get("date") ?? undefined,
            from: params.get("from") ?? undefined,
            to: params.get("to") ?? undefined,
            service: service && isService(service) ? service : undefined,
            limit: positiveInt(params.get("limit")),
            offset: positiveInt(params.get("offset")),
        })

        return NextResponse.json(result)
    })
}
