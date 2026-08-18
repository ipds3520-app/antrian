import * as p from "drizzle-orm/pg-core"

export const users = p.pgTable("users", {
    id: p.serial("id").primaryKey(),
    name: p.varchar({ length: 70 }).notNull(),
    email: p.text("email").notNull().unique(),
    passwordHash: p.text("password_hash").notNull(),
    role: p
        .text("role", { enum: ["client", "admin"] })
        .notNull()
        .default("client"),
    createdAt: p.timestamp("created_at").defaultNow().notNull(),
})

export const antrian = p.pgTable("antrian", {
    id: p.serial("id").primaryKey(),
    deviceId: p.text("device_id"),
    jenisLayanan: p.text("jenis_layanan").notNull(),
    nomorAntri: p.integer("nomor_antri").notNull(),
    appointmentTime: p.timestamp("appointment_time").notNull(),
    status: p
        .text("status", {
            enum: ["waiting", "in_progress", "done"],
        })
        .notNull()
        .default("waiting"),
    createdAt: p.timestamp("created_at").defaultNow().notNull(),
})
