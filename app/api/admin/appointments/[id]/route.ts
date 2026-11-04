import { fail, ok, withAdmin } from "@/lib/api"
import {
    deleteAppointment,
    getAppointmentById,
    updateAppointment,
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
        const result = await updateAppointment(id, body)

        if (!result) {
            return fail("Appointment tidak ditemukan", 404, "NOT_FOUND")
        }
        if (!result.ok) {
            return fail(result.message, 400, "INVALID_INPUT")
        }

        return ok(result.value)
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
