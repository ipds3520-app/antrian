import { isService } from "@/lib/antrian"
import { fail, ok, withAdmin } from "@/lib/api"
import {
    createAppointment,
    listAppointments,
    parseBookingInput,
} from "@/lib/appointments"
import { sendAppointmentReceipt } from "@/lib/receipt"

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

        return ok(result)
    })
}

export async function POST(request: Request) {
    return withAdmin(request, async () => {
        const body = await request.json().catch(() => null)
        const parsed = parseBookingInput(body, { allowPast: true })

        if (!parsed.ok) {
            return fail(parsed.message, 400, "INVALID_INPUT")
        }

        const appointment = await createAppointment(parsed.value, {
            enforceConflict: false,
        })

        const shouldSendReceipt =
            typeof body === "object" &&
            body !== null &&
            "sendReceipt" in body &&
            (body as { sendReceipt?: unknown }).sendReceipt === true

        const receipt = shouldSendReceipt
            ? await sendAppointmentReceipt(appointment)
            : undefined

        return ok({ appointment, receipt }, { status: 201 })
    })
}
