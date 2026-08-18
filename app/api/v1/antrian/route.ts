import { and, eq, gte, lt, sql } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { antrian } from "@/lib/db/schema"

export async function GET(request: NextRequest) {
    try {
        const userRole = request.headers.get("x-user-role")

        if (!userRole) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 },
            )
        }

        const now = new Date()
        const startOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
        )
        const endOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
        )

        const rows = await db
            .select()
            .from(antrian)
            .where(
                and(
                    gte(antrian.createdAt, startOfDay),
                    lt(antrian.createdAt, endOfDay),
                    eq(antrian.status, "waiting"),
                    gte(antrian.appointmentTime, now),
                ),
            )
            .orderBy(antrian.appointmentTime)

        return NextResponse.json({ success: true, data: rows })
    } catch {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { jenisLayanan, appointmentTime, deviceId } = body

        if (!jenisLayanan || !appointmentTime || !deviceId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "jenisLayanan, appointmentTime, and deviceId are required",
                },
                { status: 400 },
            )
        }

        const existingActive = await db
            .select({ id: antrian.id })
            .from(antrian)
            .where(
                and(
                    eq(antrian.deviceId, deviceId),
                    eq(antrian.status, "waiting"),
                    gte(antrian.appointmentTime, new Date()),
                ),
            )
            .limit(1)
            .then((rows) => rows[0])

        if (existingActive) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Device already has an active antrian. Wait for it to expire.",
                },
                { status: 409 },
            )
        }

        const today = new Date()
        const startOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
        )
        const endOfDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1,
        )

        const lastNumber = await db
            .select({
                maxNomor: sql<number>`coalesce(max(${antrian.nomorAntri}), 0)`,
            })
            .from(antrian)
            .where(
                and(
                    eq(antrian.jenisLayanan, jenisLayanan),
                    gte(antrian.createdAt, startOfDay),
                    lt(antrian.createdAt, endOfDay),
                ),
            )
            .then((rows) => rows[0])

        const newNomor = (lastNumber?.maxNomor ?? 0) + 1

        const newAntrian = await db
            .insert(antrian)
            .values({
                deviceId,
                jenisLayanan,
                nomorAntri: newNomor,
                appointmentTime: new Date(appointmentTime),
            })
            .returning()
            .then((rows) => rows[0])

        return NextResponse.json(
            { success: true, data: newAntrian },
            { status: 201 },
        )
    } catch {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        )
    }
}
