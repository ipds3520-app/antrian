import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { signToken } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email and password are required",
                },
                { status: 400 },
            )
        }

        const user = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1)
            .then((rows) => rows[0])

        if (!user) {
            return NextResponse.json(
                { success: false, message: "Invalid credentials" },
                { status: 401 },
            )
        }

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) {
            return NextResponse.json(
                { success: false, message: "Invalid credentials" },
                { status: 401 },
            )
        }

        const token = await signToken({
            id: user.id,
            email: user.email,
            role: user.role as "client" | "admin",
        })

        return NextResponse.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
        })
    } catch {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        )
    }
}
