import { isValidPhone, normalizePhone } from "@/lib/validation"

interface WhatsAppResult {
    sent: boolean
    error?: string
}

async function sendViaFonnte(
    target: string,
    message: string,
): Promise<WhatsAppResult> {
    const token = process.env.FONNTE_TOKEN
    if (!token) return { sent: false, error: "FONNTE_TOKEN belum diatur" }

    try {
        const body = new URLSearchParams({ target, message })
        const response = await fetch("https://api.fonnte.com/send", {
            method: "POST",
            headers: { Authorization: token },
            body,
            signal: AbortSignal.timeout(10_000),
        })

        if (!response.ok) {
            const detail = await response.text().catch(() => "")
            console.error("[whatsapp] Fonnte gagal", response.status, detail)
            return { sent: false, error: "Gagal mengirim WhatsApp" }
        }

        return { sent: true }
    } catch (error) {
        console.error("[whatsapp] Fonnte gagal", error)
        return { sent: false, error: "Gagal mengirim WhatsApp" }
    }
}

async function sendViaGenericWebhook(
    target: string,
    message: string,
): Promise<WhatsAppResult> {
    const url = process.env.WHATSAPP_API_URL
    if (!url) return { sent: false, error: "WHATSAPP_API_URL belum diatur" }

    const apiKey = process.env.WHATSAPP_API_KEY

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({ target, message }),
            signal: AbortSignal.timeout(10_000),
        })

        if (!response.ok) {
            const detail = await response.text().catch(() => "")
            console.error("[whatsapp] webhook gagal", response.status, detail)
            return { sent: false, error: "Gagal mengirim WhatsApp" }
        }

        return { sent: true }
    } catch (error) {
        console.error("[whatsapp] webhook gagal", error)
        return { sent: false, error: "Gagal mengirim WhatsApp" }
    }
}

export async function sendWhatsAppMessage(
    phone: string,
    message: string,
): Promise<WhatsAppResult> {
    const target = normalizePhone(phone)
    if (!isValidPhone(target)) {
        console.info("[whatsapp] nomor tidak valid, pesan tidak dikirim", phone)
        return { sent: false, error: "Nomor WhatsApp tidak valid" }
    }

    const provider =
        process.env.WHATSAPP_PROVIDER ??
        (process.env.FONNTE_TOKEN
            ? "fonnte"
            : process.env.WHATSAPP_API_URL
              ? "generic"
              : "log")

    if (provider === "fonnte") {
        return sendViaFonnte(target, message)
    }

    if (provider === "generic") {
        return sendViaGenericWebhook(target, message)
    }

    console.info(`[whatsapp] provider log. Pesan untuk ${target}:\n${message}`)
    return { sent: false, error: "WhatsApp provider belum dikonfigurasi" }
}
