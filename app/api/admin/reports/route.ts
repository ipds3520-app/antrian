import { NextResponse } from "next/server"
import { fail, withAdmin } from "@/lib/api"
import { listAppointmentsForReport } from "@/lib/appointments"
import { resolveReportRange, summarizeAppointments } from "@/lib/reports"
import type { AppointmentStatus } from "@/lib/types"

function parseStatus(value: string | null): AppointmentStatus | undefined {
    return value === "proses" || value === "selesai" ? value : undefined
}

export async function GET(request: Request) {
    return withAdmin(request, async () => {
        const params = new URL(request.url).searchParams

        const resolved = resolveReportRange({
            period: params.get("period"),
            date: params.get("date"),
            month: params.get("month"),
            year: params.get("year"),
            from: params.get("from"),
            to: params.get("to"),
        })

        if (!resolved.ok) {
            return fail(resolved.message, 400, "INVALID_INPUT")
        }

        const service = params.get("service")
        const status = parseStatus(params.get("status"))

        const rows = await listAppointmentsForReport({
            from: resolved.range.from,
            to: resolved.range.to,
            service: service && service !== "all" ? service : undefined,
        })

        const filtered = status
            ? rows.filter((row) => row.status === status)
            : rows

        return NextResponse.json({
            data: filtered,
            summary: summarizeAppointments(filtered),
            range: resolved.range,
        })
    })
}
