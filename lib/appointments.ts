import { randomUUID } from "node:crypto"
import {
    getNowKeys,
    isPastDateTime,
    isService,
    isValidDateKey,
    isValidTimeKey,
    normalizeTimeKey,
    type Service,
    serviceLabel,
} from "@/lib/antrian"
import { getSupabaseClient } from "@/lib/supabase"
import type { AppointmentDto, AppointmentRow } from "@/lib/types"
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
        id: row.id,
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
        status: isPastDateTime(bookedDate, time) ? "expired" : "upcoming",
    }
}

async function nextQueueNumber(
    bookedDate: string,
    service: string,
): Promise<number> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("appointment")
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
            .from("appointment")
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

    const newRow: AppointmentRow = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        name: input.name,
        email: input.email,
        phone: input.phone,
        booked_date: input.bookedDate,
        time: input.time,
        service: input.service,
        queue_number: queueNumber,
    }

    const { data, error } = await supabase
        .from("appointment")
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

export async function updateAppointment(
    id: string,
    body: unknown,
): Promise<ParseResult<AppointmentDto> | null> {
    const existing = await getAppointmentById(id)
    if (!existing) return null

    const record = asRecord(body)
    const merged = {
        name: record.name === undefined ? existing.name : record.name,
        email: record.email === undefined ? existing.email : record.email,
        phone: record.phone === undefined ? existing.phone : record.phone,
        bookedDate:
            record.bookedDate === undefined
                ? existing.bookedDate
                : record.bookedDate,
        time: record.time === undefined ? existing.time : record.time,
        service:
            record.service === undefined ? existing.service : record.service,
        queueNumber: record.queueNumber,
    }

    const parsed = validateBooking(merged, { allowPast: true })
    if (!parsed.ok) return parsed

    const dateChanged = parsed.value.bookedDate !== existing.bookedDate
    const serviceChanged = parsed.value.service !== existing.service

    let queueNumber = parsed.value.queueNumber
    if (queueNumber === undefined) {
        if (dateChanged || serviceChanged) {
            queueNumber = await nextQueueNumber(
                parsed.value.bookedDate,
                parsed.value.service,
            )
        } else {
            queueNumber = existing.queueNumber ?? undefined
        }
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("appointment")
        .update({
            name: parsed.value.name,
            email: parsed.value.email,
            phone: parsed.value.phone,
            booked_date: parsed.value.bookedDate,
            time: parsed.value.time,
            service: parsed.value.service,
            queue_number: queueNumber ?? null,
        })
        .eq("id", id)
        .select()
        .single()

    if (error || !data) {
        throw new Error(
            `Gagal memperbarui appointment: ${error?.message ?? "unknown error"}`,
        )
    }

    return { ok: true, value: toAppointmentDto(data as AppointmentRow) }
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
    let query = supabase.from("appointment").select("*", { count: "exact" })

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

export async function getAppointmentById(
    id: string,
): Promise<AppointmentDto | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from("appointment")
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
        .from("appointment")
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
