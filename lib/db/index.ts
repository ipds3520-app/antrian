import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur")
}

const client = postgres(connectionString, {
    // Required when connecting through Supabase's transaction pooler.
    prepare: false,
    types: {
        date: {
            to: 1082,
            from: [1082],
            serialize: (value: string) => value,
            parse: (value: string) => value,
        },
    },
})

export const db = drizzle(client, { schema })
