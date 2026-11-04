import { fail, ok, withAdmin } from "@/lib/api"
import { getAppointmentById } from "@/lib/appointments"
import { sendAppointmentReceipt } from "@/lib/receipt"

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    return withAdmin(request, async () => {
        const { id } = await params
        const appointment = await getAppointmentById(id)

        if (!appointment) {
            return fail("Appointment tidak ditemukan", 404, "NOT_FOUND")
        }

        const receipt = await sendAppointmentReceipt(appointment)
        return ok(receipt)
    })
}
