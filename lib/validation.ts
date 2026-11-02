const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^62\d{8,14}$/

export function normalizeEmail(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function isValidEmail(value: string): boolean {
    return value.length <= 254 && EMAIL_PATTERN.test(value)
}

/**
 * Normalizes an Indonesian phone number to the 62xxxxxxxxxx format used by
 * WhatsApp gateways such as Fonnte.
 */
export function normalizePhone(value: unknown): string {
    if (typeof value !== "string") return ""

    const digits = value.replace(/[^\d]/g, "")
    if (!digits) return ""

    if (digits.startsWith("62")) return digits
    if (digits.startsWith("0")) return `62${digits.slice(1)}`
    if (digits.startsWith("8")) return `62${digits}`

    return digits
}

export function isValidPhone(value: string): boolean {
    return PHONE_PATTERN.test(value)
}

export function displayNameFromEmail(email: string): string {
    const localPart = email.split("@")[0] ?? email
    const words = localPart.replace(/[._-]+/g, " ").trim()

    if (!words) return email

    return words
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}
