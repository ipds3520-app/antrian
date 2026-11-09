import {
    getNowKeys,
    isService,
    isValidDateKey,
    isValidTimeKey,
    normalizeTimeKey,
    type Service,
    serviceLabel,
} from "@/lib/antrian"
import { getSupabaseClient } from "@/lib/supabase"
import type {
    AppointmentDto,
    AppointmentRow,
    AppointmentStatus,
} from "@/lib/types"
import {
    isValidEmail,
    isValidPhone,
    normalizeEmail,
    normalizePhone,
} from "@/lib/validation"

export interface BookingInput {
    name: string
    email: string
    phone: string
    bookedDate: string
    time: string
    service: Service
}

export type ParseResult<T> =
    | { ok: true; value: T }
    | { ok: false; message: string }

export class BookingConflictError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "BookingConflictError"
    }
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {}
}

function readString(value: unknown): string {
    return typeof value === "string" ? value.trim() : ""
}

function parseQueueNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined

    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN
}

function validateBooking(
    body: unknown,
    options: { allowPast?: boolean } = {},
): ParseResult<BookingInput & { queueNumber?: number }> {
    const record = asRecord(body)
    const name = readString(record.name)
    const email = normalizeEmail(record.email)
    const phone = normalizePhone(record.phone)
    const bookedDate = readString(record.bookedDate)
    const rawTime = readString(record.time)
    const service = record.service
    const queueNumber = parseQueueNumber(record.queueNumber)

    if (name.length < 2 || name.length > 120) {
        return { ok: false, message: "Nama harus diisi (2-120 karakter)" }
    }
    if (!isValidEmail(email)) {
        return { ok: false, message: "Email tidak valid" }
    }
    if (!isValidPhone(phone)) {
        return {
            ok: false,
            message: "Nomor WhatsApp tidak valid (contoh: 081234567890)",
        }
    }
    if (!isValidDateKey(bookedDate)) {
        return {
            ok: false,
            message: "Tanggal wajib diisi dengan format YYYY-MM-DD",
        }
    }
    if (!isValidTimeKey(rawTime)) {
        return {
            ok: false,
            message: "Waktu wajib diisi dengan format HH:mm",
        }
    }
    if (!isService(service)) {
        return { ok: false, message: "Layanan tidak valid" }
    }
    if (Number.isNaN(queueNumber)) {
        return {
            ok: false,
            message: "Nomor antrian harus bilangan bulat positif",
        }
    }

    const time = normalizeTimeKey(rawTime)

    if (!options.allowPast) {
        const now = getNowKeys()
        if (bookedDate < now.dateKey) {
            return {
                ok: false,
                message: "Tidak dapat memesan tanggal yang sudah lewat",
            }
        }
        if (bookedDate === now.dateKey && time <= now.timeKey) {
            return {
                ok: false,
                message: "Waktu pemesanan hari ini sudah lewat",
            }
        }
    }

    return {
        ok: true,
        value: { name, email, phone, bookedDate, time, service, queueNumber },
    }
}

export function parseBookingInput(
    body: unknown,
    options: { allowPast?: boolean } = {},
): ParseResult<BookingInput & { queueNumber?: number }> {
    return validateBooking(body, options)
}

function normalizeDateValue(value: string | Date): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
    }
    return String(value).slice(0, 10)
}

export function toAppointmentDto(row: AppointmentRow): AppointmentDto {
    const bookedDate = normalizeDateValue(row.booked_date)
    const time = normalizeTimeKey(String(row.time))

    return {
        id: String(row.id),
        createdAt: row.created_at
            ? new Date(row.created_at).toISOString()
            : null,
        name: row.name,
        email: row.email,
        phone: row.phone,
        bookedDate,
        time,
        service: row.service,
        serviceLabel: serviceLabel(row.service),
        queueNumber: row.queue_number,
        status: normalizeAppointmentStatus(row.status),
        completedAt: row.completed_at
            ? new Date(row.completed_at).toISOString()
            : null,
    }
}

function normalizeAppointmentStatus(
    status: string | null | undefined,
): AppointmentStatus {
    return status?.toLowerCase() === "selesai" ? "selesai" : "proses"
}

async function nextQueueNumber(
    bookedDate: string,
    service: string,
): Promise<number> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("appointments")
        .select("queue_number")
        .eq("booked_date", bookedDate)
        .eq("service", service)
        .order("queue_number", { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) {
        console.error(
            "[supabase] gagal mendapatkan antrian berikutnya",
            error.message,
        )
    }

    return Number(data?.queue_number ?? 0) + 1
}

function activeAppointmentExists(
    rows: Array<{ bookedDate: string; time: string }>,
    bookedDate: string,
): boolean {
    const now = getNowKeys()

    return rows.some((row) => {
        if (bookedDate > now.dateKey) return true
        if (bookedDate < now.dateKey) return false
        return normalizeTimeKey(row.time) > now.timeKey
    })
}

export async function createAppointment(
    input: BookingInput & { queueNumber?: number },
    options: { enforceConflict?: boolean } = {},
): Promise<AppointmentDto> {
    const enforceConflict = options.enforceConflict ?? true
    const supabase = getSupabaseClient()

    if (enforceConflict) {
        const { data: existing, error: existingError } = await supabase
            .from("appointments")
            .select("booked_date, time")
            .ilike("email", input.email)
            .eq("booked_date", input.bookedDate)

        if (existingError) {
            console.error(
                "[supabase] gagal cek konflik booking",
                existingError.message,
            )
        }

        const normalized = (existing ?? []).map((entry) => ({
            bookedDate: normalizeDateValue(entry.booked_date),
            time: String(entry.time),
        }))

        if (activeAppointmentExists(normalized, input.bookedDate)) {
            throw new BookingConflictError(
                "Anda masih memiliki appointment aktif pada tanggal tersebut",
            )
        }
    }

    const queueNumber =
        input.queueNumber ??
        (await nextQueueNumber(input.bookedDate, input.service))

    const newRow: Omit<AppointmentRow, "id"> = {
        created_at: new Date().toISOString(),
        name: input.name,
        email: input.email,
        phone: input.phone,
        booked_date: input.bookedDate,
        time: input.time,
        service: input.service,
        queue_number: queueNumber,
        status: "proses",
        completed_at: null,
    }

    const { data, error } = await supabase
        .from("appointments")
        .insert(newRow)
        .select()
        .single()

    if (error || !data) {
        throw new Error(
            `Gagal membuat appointment: ${error?.message ?? "unknown error"}`,
        )
    }

    return toAppointmentDto(data as AppointmentRow)
}

export async function setAppointmentStatus(
    id: string,
    status: AppointmentStatus,
): Promise<AppointmentDto | null> {
    const completedAt = status === "selesai" ? new Date().toISOString() : null

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("appointments")
        .update({ status, completed_at: completedAt })
        .eq("id", id)
        .select()
        .maybeSingle()

    if (error) {
        throw new Error(
            `Gagal memperbarui status appointment: ${error.message}`,
        )
    }

    return data ? toAppointmentDto(data as AppointmentRow) : null
}

export interface AppointmentFilters {
    email?: string
    date?: string
    from?: string
    to?: string
    service?: string
    q?: string
    limit?: number
    offset?: number
}

export async function listAppointments(filters: AppointmentFilters) {
    const supabase = getSupabaseClient()
    let query = supabase.from("appointments").select("*", { count: "exact" })

    if (filters.email) {
        query = query.ilike("email", normalizeEmail(filters.email))
    }
    if (filters.date && isValidDateKey(filters.date)) {
        query = query.eq("booked_date", filters.date)
    }
    if (filters.from && isValidDateKey(filters.from)) {
        query = query.gte("booked_date", filters.from)
    }
    if (filters.to && isValidDateKey(filters.to)) {
        query = query.lte("booked_date", filters.to)
    }
    if (filters.service && isService(filters.service)) {
        query = query.eq("service", filters.service)
    }
    if (filters.q) {
        const search = filters.q.trim()
        query = query.or(
            `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
        )
    }

    const limit = Math.min(Math.max(1, filters.limit ?? 50), 200)
    const offset = Math.max(0, filters.offset ?? 0)

    query = query
        .order("booked_date", { ascending: false })
        .order("time", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
        console.error("[supabase] gagal list appointments", error.message)
        throw new Error(`Gagal mengambil data appointments: ${error.message}`)
    }

    const total = count ?? 0
    const rows = (data ?? []) as AppointmentRow[]

    return {
        data: rows.map(toAppointmentDto),
        pagination: {
            total,
            limit,
            offset,
            hasMore: offset + rows.length < total,
        },
    }
}

const REPORT_PAGE_SIZE = 1000

/**
 * Fetches every appointment inside a date range for the admin report. Uses
 * chunked pagination because PostgREST caps the number of returned rows.
 */
export async function listAppointmentsForReport(filters: {
    from: string
    to: string
    service?: string
}): Promise<AppointmentDto[]> {
    if (!isValidDateKey(filters.from) || !isValidDateKey(filters.to)) {
        throw new Error("Rentang tanggal laporan tidak valid")
    }

    const supabase = getSupabaseClient()
    const rows: AppointmentRow[] = []
    let offset = 0

    while (true) {
        let query = supabase
            .from("appointments")
            .select("*")
            .gte("booked_date", filters.from)
            .lte("booked_date", filters.to)

        if (filters.service && isService(filters.service)) {
            query = query.eq("service", filters.service)
        }

        const { data, error } = await query
            .order("booked_date", { ascending: true })
            .order("time", { ascending: true })
            .order("created_at", { ascending: true })
            .range(offset, offset + REPORT_PAGE_SIZE - 1)

        if (error) {
            console.error("[supabase] gagal list laporan", error.message)
            throw new Error(`Gagal mengambil data laporan: ${error.message}`)
        }

        const chunk = (data ?? []) as AppointmentRow[]
        rows.push(...chunk)

        if (chunk.length < REPORT_PAGE_SIZE) break

        offset += REPORT_PAGE_SIZE
    }

    return rows.map(toAppointmentDto)
}

export async function getAppointmentById(
    id: string,
): Promise<AppointmentDto | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", id)
        .maybeSingle()

    if (error) {
        console.error("[supabase] gagal get appointment by id", error.message)
        return null
    }

    return data ? toAppointmentDto(data as AppointmentRow) : null
}

export async function deleteAppointment(
    id: string,
): Promise<AppointmentDto | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id)
        .select()
        .maybeSingle()

    if (error) {
        console.error("[supabase] gagal delete appointment", error.message)
        return null
    }

    return data ? toAppointmentDto(data as AppointmentRow) : null
}
