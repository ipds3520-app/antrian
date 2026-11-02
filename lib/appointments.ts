import { randomUUID } from "node:crypto"
import {
    and,
    count,
    desc,
    eq,
    gte,
    ilike,
    lte,
    or,
    type SQL,
    sql,
} from "drizzle-orm"
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
import { db } from "@/lib/db"
import { appointment } from "@/lib/db/schema"
import type { AppointmentDto } from "@/lib/types"
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

export function toAppointmentDto(
    row: typeof appointment.$inferSelect,
): AppointmentDto {
    const bookedDate = normalizeDateValue(row.bookedDate)
    const time = normalizeTimeKey(String(row.time))

    return {
        id: row.id,
        createdAt: row.createdAt ? row.createdAt.toISOString() : null,
        name: row.name,
        email: row.email,
        phone: row.phone,
        bookedDate,
        time,
        service: row.service,
        serviceLabel: serviceLabel(row.service),
        queueNumber: row.queueNumber,
        status: isPastDateTime(bookedDate, time) ? "expired" : "upcoming",
    }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function lock(tx: Transaction, key: string) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`)
}

async function nextQueueNumber(
    tx: Transaction,
    bookedDate: string,
    service: string,
): Promise<number> {
    await lock(tx, `queue:${bookedDate}:${service}`)

    const rows = await tx
        .select({
            max: sql<number>`coalesce(max(${appointment.queueNumber}), 0)`,
        })
        .from(appointment)
        .where(
            and(
                eq(appointment.bookedDate, bookedDate),
                eq(appointment.service, service),
            ),
        )

    return Number(rows[0]?.max ?? 0) + 1
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

    const row = await db.transaction(async (tx) => {
        if (enforceConflict) {
            await lock(tx, `booking:${input.email}:${input.bookedDate}`)

            const existing = await tx
                .select({
                    bookedDate: appointment.bookedDate,
                    time: appointment.time,
                })
                .from(appointment)
                .where(
                    and(
                        sql`lower(${appointment.email}) = ${input.email}`,
                        eq(appointment.bookedDate, input.bookedDate),
                    ),
                )

            const normalized = existing.map((entry) => ({
                bookedDate: normalizeDateValue(entry.bookedDate),
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
            (await nextQueueNumber(tx, input.bookedDate, input.service))

        const inserted = await tx
            .insert(appointment)
            .values({
                id: randomUUID(),
                createdAt: new Date(),
                name: input.name,
                email: input.email,
                phone: input.phone,
                bookedDate: input.bookedDate,
                time: input.time,
                service: input.service,
                queueNumber,
            })
            .returning()

        const created = inserted[0]
        if (!created) throw new Error("Gagal membuat appointment")
        return created
    })

    return toAppointmentDto(row)
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

    const row = await db.transaction(async (tx) => {
        let queueNumber = parsed.value.queueNumber

        if (queueNumber === undefined) {
            if (dateChanged || serviceChanged) {
                queueNumber = await nextQueueNumber(
                    tx,
                    parsed.value.bookedDate,
                    parsed.value.service,
                )
            } else {
                queueNumber = existing.queueNumber ?? undefined
            }
        }

        const updated = await tx
            .update(appointment)
            .set({
                name: parsed.value.name,
                email: parsed.value.email,
                phone: parsed.value.phone,
                bookedDate: parsed.value.bookedDate,
                time: parsed.value.time,
                service: parsed.value.service,
                queueNumber,
            })
            .where(eq(appointment.id, id))
            .returning()

        const result = updated[0]
        if (!result) throw new Error("Gagal memperbarui appointment")
        return result
    })

    return { ok: true, value: toAppointmentDto(row) }
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
    const conditions: SQL[] = []

    if (filters.email) {
        conditions.push(
            sql`lower(${appointment.email}) = ${normalizeEmail(filters.email)}`,
        )
    }
    if (filters.date && isValidDateKey(filters.date)) {
        conditions.push(eq(appointment.bookedDate, filters.date))
    }
    if (filters.from && isValidDateKey(filters.from)) {
        conditions.push(gte(appointment.bookedDate, filters.from))
    }
    if (filters.to && isValidDateKey(filters.to)) {
        conditions.push(lte(appointment.bookedDate, filters.to))
    }
    if (filters.service && isService(filters.service)) {
        conditions.push(eq(appointment.service, filters.service))
    }
    if (filters.q) {
        const search = `%${filters.q.trim()}%`
        conditions.push(
            or(
                ilike(appointment.name, search),
                ilike(appointment.email, search),
                ilike(appointment.phone, search),
            ) as SQL,
        )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined
    const limit = Math.min(Math.max(1, filters.limit ?? 50), 200)
    const offset = Math.max(0, filters.offset ?? 0)

    const rows = await db
        .select()
        .from(appointment)
        .where(where)
        .orderBy(
            desc(appointment.bookedDate),
            desc(appointment.time),
            desc(appointment.createdAt),
        )
        .limit(limit)
        .offset(offset)

    const totalRows = await db
        .select({ value: count() })
        .from(appointment)
        .where(where)

    const total = Number(totalRows[0]?.value ?? 0)

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
    const rows = await db
        .select()
        .from(appointment)
        .where(eq(appointment.id, id))
        .limit(1)

    const row = rows[0]
    return row ? toAppointmentDto(row) : null
}

export async function deleteAppointment(
    id: string,
): Promise<AppointmentDto | null> {
    const rows = await db
        .delete(appointment)
        .where(eq(appointment.id, id))
        .returning()

    const row = rows[0]
    return row ? toAppointmentDto(row) : null
}
