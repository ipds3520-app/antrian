import { and, eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import {
    isJenisLayanan,
    isValidDateKey,
    isValidTimeKey,
    toDateKey,
} from "@/lib/antrian"
import { db } from "@/lib/db"
import { antrian, user as authUser } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"

export async function GET(request: Request) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = user.role === "admin"
    const dateParam = new URL(request.url).searchParams.get("date")
    const date =
        isAdmin && isValidDateKey(dateParam) ? dateParam : toDateKey(new Date())

    if (isAdmin) {
        const rows = await db
            .select({
                id: antrian.id,
                userId: antrian.userId,
                userName: authUser.name,
                userEmail: authUser.email,
                jenisLayanan: antrian.jenisLayanan,
                nomorAntri: antrian.nomorAntri,
                tanggal: antrian.tanggal,
                appointmentTime: antrian.appointmentTime,
                status: antrian.status,
                createdAt: antrian.createdAt,
            })
            .from(antrian)
            .leftJoin(authUser, eq(antrian.userId, authUser.id))
            .where(eq(antrian.tanggal, date))
            .orderBy(antrian.appointmentTime, antrian.nomorAntri)

        return NextResponse.json(rows)
    }

    const rows = await db
        .select()
        .from(antrian)
        .where(eq(antrian.tanggal, date))
        .orderBy(antrian.appointmentTime, antrian.nomorAntri)

    return NextResponse.json(rows)
}

export async function POST(request: Request) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
        return NextResponse.json(
            { message: "Invalid JSON body" },
            { status: 400 },
        )
    }

    const { jenisLayanan, tanggal, waktu } = body

    if (!isJenisLayanan(jenisLayanan)) {
        return NextResponse.json(
            { message: "jenisLayanan tidak valid" },
            { status: 400 },
        )
    }
    if (!isValidDateKey(tanggal)) {
        return NextResponse.json(
            { message: "tanggal wajib diisi dengan format YYYY-MM-DD" },
            { status: 400 },
        )
    }
    if (!isValidTimeKey(waktu)) {
        return NextResponse.json(
            { message: "waktu wajib diisi dengan format HH:mm" },
            { status: 400 },
        )
    }

    const today = toDateKey(new Date())
    if (tanggal < today) {
        return NextResponse.json(
            {
                message:
                    "Tidak bisa mengambil antrian untuk tanggal yang sudah lewat",
            },
            { status: 400 },
        )
    }

    const existingActive = await db
        .select({ id: antrian.id })
        .from(antrian)
        .where(
            and(
                eq(antrian.userId, user.id),
                eq(antrian.tanggal, tanggal),
                eq(antrian.status, "waiting"),
            ),
        )
        .limit(1)
        .then((rows) => rows[0])

    if (existingActive) {
        return NextResponse.json(
            {
                message:
                    "Anda sudah memiliki antrian aktif pada tanggal tersebut",
            },
            { status: 409 },
        )
    }

    const lastNumber = await db
        .select({
            maxNomor: sql<number>`coalesce(max(${antrian.nomorAntri}), 0)`,
        })
        .from(antrian)
        .where(
            and(
                eq(antrian.jenisLayanan, jenisLayanan),
                eq(antrian.tanggal, tanggal),
            ),
        )
        .then((rows) => rows[0])

    const newAntrian = await db
        .insert(antrian)
        .values({
            userId: user.id,
            jenisLayanan,
            nomorAntri: (lastNumber?.maxNomor ?? 0) + 1,
            tanggal,
            appointmentTime: new Date(`${tanggal}T${waktu}:00`),
        })
        .returning()
        .then((rows) => rows[0])

    return NextResponse.json(newAntrian, { status: 201 })
}
