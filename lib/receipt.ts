import { formatDateId } from "@/lib/antrian"
import type { AppointmentDto, ReceiptResult } from "@/lib/types"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

export function buildReceiptMessage(appointment: AppointmentDto): string {
    return [
        "*Bukti Pendaftaran Antrian BPS*",
        "",
        `Halo ${appointment.name},`,
        "Pendaftaran antrian Anda berhasil.",
        "",
        `Nomor antrian: *${appointment.queueNumber ?? "-"}*`,
        `Layanan: ${appointment.serviceLabel}`,
        `Tanggal: ${formatDateId(appointment.bookedDate)}`,
        `Waktu: ${appointment.time}`,
        `Email: ${appointment.email}`,
        `Telepon: ${appointment.phone ?? "-"}`,
        "",
        "Harap datang 10 menit sebelum jadwal yang dipilih.",
    ].join("\n")
}

export async function sendAppointmentReceipt(
    appointment: AppointmentDto,
): Promise<ReceiptResult> {
    const message = buildReceiptMessage(appointment)

    if (!appointment.phone) {
        return { message, sent: false, error: "Nomor WhatsApp belum diisi" }
    }

    const result = await sendWhatsAppMessage(appointment.phone, message)
    return { message, ...result }
}
