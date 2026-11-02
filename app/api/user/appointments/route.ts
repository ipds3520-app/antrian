import { eq } from "drizzle-orm"
import { fail, ok, withUser } from "@/lib/api"
import {
    BookingConflictError,
    createAppointment,
    listAppointments,
    parseBookingInput,
} from "@/lib/appointments"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { sendAppointmentReceipt } from "@/lib/receipt"

export async function GET(request: Request) {
    return withUser(request, async (user) => {
        const result = await listAppointments({ email: user.email })
        return ok(result.data)
    })
}

export async function POST(request: Request) {
    return withUser(request, async (user) => {
        const body = await request.json().catch(() => null)
        const parsed = parseBookingInput(body)

        if (!parsed.ok) {
            return fail(parsed.message, 400, "INVALID_INPUT")
        }

        if (parsed.value.email !== user.email.toLowerCase()) {
            return fail(
                "Email harus sama dengan email akun yang sedang masuk",
                400,
                "EMAIL_MISMATCH",
            )
        }

        try {
            const appointment = await createAppointment(parsed.value)

            await db
                .update(users)
                .set({
                    name: parsed.value.name,
                    phone: parsed.value.phone,
                })
                .where(eq(users.id, user.id))
                .catch((error) => {
                    console.error(
                        "[appointment] gagal memperbarui profil",
                        error,
                    )
                })

            const receipt = await sendAppointmentReceipt(appointment)

            return ok({ appointment, receipt }, { status: 201 })
        } catch (error) {
            if (error instanceof BookingConflictError) {
                return fail(error.message, 409, "BOOKING_CONFLICT")
            }

            throw error
        }
    })
}
