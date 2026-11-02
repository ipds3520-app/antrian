export const APP_TIMEZONE =
    process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Asia/Jakarta"

export const SERVICES = [
    { value: "rekomendasi_statistik", label: "Rekomendasi Statistik" },
    { value: "konsultasi_statistik", label: "Konsultasi Statistik" },
    { value: "perpustakaan", label: "Perpustakaan" },
] as const

export type Service = (typeof SERVICES)[number]["value"]

export const SERVICE_VALUES = SERVICES.map(
    (service) => service.value,
) as Service[]

export const SERVICE_LABELS = Object.fromEntries(
    SERVICES.map((service) => [service.value, service.label]),
) as Record<Service, string>

export function isService(value: unknown): value is Service {
    return (
        typeof value === "string" &&
        (SERVICE_VALUES as readonly string[]).includes(value)
    )
}

export function serviceLabel(value: string): string {
    return isService(value) ? SERVICE_LABELS[value] : value
}

export const TIME_SLOTS: string[] = []
for (let hour = 8; hour <= 16; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 16 && minute > 0) break
        TIME_SLOTS.push(
            `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        )
    }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

export function isValidDateKey(value: unknown): value is string {
    if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false

    const parsed = new Date(`${value}T00:00:00.000Z`)
    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
    )
}

export function isValidTimeKey(value: unknown): value is string {
    return typeof value === "string" && TIME_PATTERN.test(value)
}

export function normalizeTimeKey(value: string): string {
    return value.slice(0, 5)
}

function partsFor(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date)

    return Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value]),
    )
}

export function toDateKey(
    date: Date = new Date(),
    timeZone: string = APP_TIMEZONE,
): string {
    const parts = partsFor(date, timeZone)
    return `${parts.year}-${parts.month}-${parts.day}`
}

export function toTimeKey(
    date: Date = new Date(),
    timeZone: string = APP_TIMEZONE,
): string {
    const parts = partsFor(date, timeZone)
    return `${parts.hour}:${parts.minute}`
}

export function getNowKeys(timeZone: string = APP_TIMEZONE) {
    const now = new Date()
    return {
        dateKey: toDateKey(now, timeZone),
        timeKey: toTimeKey(now, timeZone),
    }
}

/**
 * An appointment is considered expired once its booked date and time have
 * passed in the configured application timezone.
 */
export function isPastDateTime(bookedDate: string, time: string): boolean {
    const now = getNowKeys()

    if (bookedDate < now.dateKey) return true
    if (bookedDate > now.dateKey) return false

    return normalizeTimeKey(time) <= now.timeKey
}

export function formatDateId(dateKey: string): string {
    return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(`${dateKey}T00:00:00`))
}
