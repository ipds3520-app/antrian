import { fail, ok, withAdmin } from "@/lib/api"
import {
    deleteAppointment,
    getAppointmentById,
    setAppointmentStatus,
} from "@/lib/appointments"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    return withAdmin(request, async () => {
        const { id } = await params
        const appointment = await getAppointmentById(id)

        if (!appointment) {
            return fail("Appointment tidak ditemukan", 404, "NOT_FOUND")
        }

        return ok(appointment)
    })
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    return withAdmin(request, async () => {
        const { id } = await params
        const body = await request.json().catch(() => null)
        const record =
            typeof body === "object" && body !== null
                ? (body as Record<string, unknown>)
                : null

        if (!record || record.status === undefined) {
            return fail(
                "Hanya status appointment yang dapat diubah oleh admin",
                400,
                "INVALID_INPUT",
            )
        }

        if (record.status !== "proses" && record.status !== "selesai") {
            return fail(
                "Status harus 'proses' atau 'selesai'",
                400,
                "INVALID_INPUT",
            )
        }

        const updated = await setAppointmentStatus(id, record.status)

        if (!updated) {
            return fail("Appointment tidak ditemukan", 404, "NOT_FOUND")
        }

        return ok(updated)
    })
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    return withAdmin(request, async () => {
        const { id } = await params
        const deleted = await deleteAppointment(id)

        if (!deleted) {
            return fail("Appointment tidak ditemukan", 404, "NOT_FOUND")
        }

        return ok(deleted)
    })
}
