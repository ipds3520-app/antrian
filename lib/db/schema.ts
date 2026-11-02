/**
 * These tables mirror the existing Supabase tables in the `public` schema.
 * Adjust the column names below if your Supabase column names differ.
 */
export const users = p.pgTable("users", {
    id: p.text("id").primaryKey(),
    createdAt: p
        .timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    email: p.text("email").notNull(),
    name: p.text("name"),
    role: p.text("role").default("user"),
    password: p.text("password"),
    phone: p.text("phone"),
})

export const appointment = p.pgTable("appointment", {
    id: p.text("id").primaryKey(),
    createdAt: p
        .timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    name: p.text("name").notNull(),
    email: p.text("email").notNull(),
    bookedDate: p.date("booked_date").notNull(),
    time: p.time("time").notNull(),
    service: p.text("service").notNull(),
    phone: p.text("phone"),
    queueNumber: p.integer("queue_number"),
})

export type User = typeof users.$inferSelect
export type Appointment = typeof appointment.$inferSelect
