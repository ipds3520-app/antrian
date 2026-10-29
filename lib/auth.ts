import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/lib/db"
import { account, session, user, verification } from "@/lib/db/schema"

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: { user, session, account, verification },
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            role: {
                type: ["admin"],
                defaultValue: "admin",
                input: false,
            },
        },
    },
})
