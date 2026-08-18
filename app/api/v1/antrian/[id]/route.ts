import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { antrian } from "@/lib/db/schema"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userRole = request.headers.get("x-user-role")

        if (!userRole) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 },
            )
        }

        const { id } = await params

        const row = await db
            .select()
            .from(antrian)
            .where(eq(antrian.id, Number(id)))
            .limit(1)
            .then((rows) => rows[0])

        if (!row) {
            return NextResponse.json(
                { success: false, message: "Antrian not found" },
                { status: 404 },
            )
        }

        return NextResponse.json({ success: true, data: row })
    } catch {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        )
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userRole = request.headers.get("x-user-role")

        if (userRole !== "admin") {
            return NextResponse.json(
                { success: false, message: "Forbidden" },
                { status: 403 },
            )
        }

        const { id } = await params
        const body = await request.json()
        const { status } = body

        if (!status || !["waiting", "in_progress", "done"].includes(status)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Status must be waiting, in_progress, or done",
                },
                { status: 400 },
            )
        }

        const updated = await db
            .update(antrian)
            .set({ status })
            .where(eq(antrian.id, Number(id)))
            .returning()
            .then((rows) => rows[0])

        if (!updated) {
            return NextResponse.json(
                { success: false, message: "Antrian not found" },
                { status: 404 },
            )
        }

        return NextResponse.json({ success: true, data: updated })
    } catch {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const userRole = request.headers.get("x-user-role")

        if (userRole !== "admin") {
            return NextResponse.json(
                { success: false, message: "Forbidden" },
                { status: 403 },
            )
        }

        const { id } = await params

        const deleted = await db
            .delete(antrian)
            .where(eq(antrian.id, Number(id)))
            .returning()
            .then((rows) => rows[0])

        if (!deleted) {
            return NextResponse.json(
                { success: false, message: "Antrian not found" },
                { status: 404 },
            )
        }

        return NextResponse.json({ success: true, data: deleted })
    } catch {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        )
    }
}
