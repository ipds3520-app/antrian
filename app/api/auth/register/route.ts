import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, password, role } = body

        if (!name || !email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Name, email, and password are required",
                },
                { status: 400 },
            )
        }

        const existing = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1)
            .then((rows) => rows[0])

        if (existing) {
            return NextResponse.json(
                { success: false, message: "Email already registered" },
                { status: 409 },
            )
        }

        const passwordHash = await bcrypt.hash(password, 12)

        const newUser = await db
            .insert(users)
            .values({
                name,
                email,
                passwordHash,
                role: role === "admin" ? "admin" : "client",
            })
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
            })
            .then((rows) => rows[0])

        return NextResponse.json(
            { success: true, data: newUser },
            { status: 201 },
        )
    } catch {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        )
    }
}
