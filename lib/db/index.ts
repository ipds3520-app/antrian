import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const client = postgres(process.env.DATABASE_URL ?? "", {
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
