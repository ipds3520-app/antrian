import { isValidDateKey, SERVICES } from "@/lib/antrian"
import type { AppointmentDto } from "@/lib/types"

export const REPORT_PERIODS = ["day", "month", "year", "custom"] as const

export type ReportPeriod = (typeof REPORT_PERIODS)[number]

export interface ReportRange {
    period: ReportPeriod
    from: string
    to: string
}

export type ReportRangeResult =
    | { ok: true; range: ReportRange }
    | { ok: false; message: string }

function isReportPeriod(value: string | null): value is ReportPeriod {
    return (
        value !== null && (REPORT_PERIODS as readonly string[]).includes(value)
    )
}

function pad(value: number): string {
    return String(value).padStart(2, "0")
}

function lastDayOfMonth(month: string): number {
    const [year, monthPart] = month.split("-").map(Number)
    return new Date(Date.UTC(year, monthPart, 0)).getUTCDate()
}

export function monthRange(month: string): { from: string; to: string } | null {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null

    return {
        from: `${month}-01`,
        to: `${month}-${pad(lastDayOfMonth(month))}`,
    }
}

function isValidYear(value: string | null): value is string {
    if (!value || !/^\d{4}$/.test(value)) return false
    const year = Number(value)
    return year >= 2000 && year <= 2100
}

export function resolveReportRange(input: {
    period: string | null
    date: string | null
    month: string | null
    year: string | null
    from: string | null
    to: string | null
}): ReportRangeResult {
    const period: ReportPeriod = isReportPeriod(input.period)
        ? input.period
        : "month"

    if (period === "day") {
        if (!isValidDateKey(input.date)) {
            return { ok: false, message: "Tanggal tidak valid" }
        }

        return {
            ok: true,
            range: { period, from: input.date, to: input.date },
        }
    }

    if (period === "month") {
        const bounds = input.month ? monthRange(input.month) : null

        if (!bounds) {
            return {
                ok: false,
                message: "Bulan tidak valid (format YYYY-MM)",
            }
        }

        return { ok: true, range: { period, ...bounds } }
    }

    if (period === "year") {
        if (!isValidYear(input.year)) {
            return { ok: false, message: "Tahun tidak valid" }
        }

        return {
            ok: true,
            range: {
                period,
                from: `${input.year}-01-01`,
                to: `${input.year}-12-31`,
            },
        }
    }

    if (!isValidDateKey(input.from) || !isValidDateKey(input.to)) {
        return { ok: false, message: "Rentang tanggal tidak valid" }
    }

    if (input.from > input.to) {
        return {
            ok: false,
            message: "Tanggal awal tidak boleh setelah tanggal akhir",
        }
    }

    return {
        ok: true,
        range: { period, from: input.from, to: input.to },
    }
}

export interface ReportServiceSummary {
    service: string
    label: string
    total: number
    selesai: number
}

export interface ReportSummary {
    total: number
    proses: number
    selesai: number
    byService: ReportServiceSummary[]
}

export function summarizeAppointments(rows: AppointmentDto[]): ReportSummary {
    const selesai = rows.filter((row) => row.status === "selesai").length

    return {
        total: rows.length,
        proses: rows.length - selesai,
        selesai,
        byService: SERVICES.map((service) => {
            const matches = rows.filter((row) => row.service === service.value)

            return {
                service: service.value,
                label: service.label,
                total: matches.length,
                selesai: matches.filter((row) => row.status === "selesai")
                    .length,
            }
        }),
    }
}
