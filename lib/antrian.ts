export const LAYANAN_OPTIONS = [
    "Perpustakaan",
    "Konsultasi Statistik",
    "Penjualan & Pembelian Data Mikro",
    "Rekomendasi Kegiatan Statistik",
] as const

export type JenisLayanan = (typeof LAYANAN_OPTIONS)[number]

export function isJenisLayanan(value: unknown): value is JenisLayanan {
    return (
        typeof value === "string" &&
        (LAYANAN_OPTIONS as readonly string[]).includes(value)
    )
}

export const ANTRIAN_STATUSES = ["waiting", "in_progress", "done"] as const

export type AntrianStatus = (typeof ANTRIAN_STATUSES)[number]

export const STATUS_LABELS: Record<AntrianStatus, string> = {
    waiting: "Menunggu",
    in_progress: "Diproses",
    done: "Selesai",
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidDateKey(value: unknown): value is string {
    return typeof value === "string" && DATE_PATTERN.test(value)
}

export function isValidTimeKey(value: unknown): value is string {
    return typeof value === "string" && TIME_PATTERN.test(value)
}

export function toDateKey(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}
