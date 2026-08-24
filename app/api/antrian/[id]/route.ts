import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { ANTRIAN_STATUSES } from "@/lib/antrian"
import { db } from "@/lib/db"
import { antrian } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    if (user.role !== "admin") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const status = body?.status

    if (!ANTRIAN_STATUSES.includes(status)) {
        return NextResponse.json(
            {
                message:
                    "status harus salah satu dari waiting, in_progress, atau done",
            },
            { status: 400 },
        )
    }

    const { id } = await params

    const updated = await db
        .update(antrian)
        .set({ status })
        .where(eq(antrian.id, Number(id)))
        .returning()
        .then((rows) => rows[0])

    if (!updated) {
        return NextResponse.json(
            { message: "Antrian tidak ditemukan" },
            { status: 404 },
        )
    }

    return NextResponse.json(updated)
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getCurrentUser()
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    if (user.role !== "admin") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const deleted = await db
        .delete(antrian)
        .where(eq(antrian.id, Number(id)))
        .returning()
        .then((rows) => rows[0])

    if (!deleted) {
        return NextResponse.json(
            { message: "Antrian tidak ditemukan" },
            { status: 404 },
        )
    }

    return NextResponse.json(deleted)
}
