import { relations } from "drizzle-orm"
import * as p from "drizzle-orm/pg-core"

export const user = p.pgTable("user", {
    id: p.text("id").primaryKey(),
    name: p.text("name").notNull(),
    email: p.text("email").notNull().unique(),
    emailVerified: p.boolean("email_verified").default(false).notNull(),
    image: p.text("image"),
    createdAt: p.timestamp("created_at").defaultNow().notNull(),
    updatedAt: p
        .timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
    role: p
        .text("role", { enum: ["client", "admin"] })
        .default("client")
        .notNull(),
})

export const session = p.pgTable(
    "session",
    {
        id: p.text("id").primaryKey(),
        expiresAt: p.timestamp("expires_at").notNull(),
        token: p.text("token").notNull().unique(),
        createdAt: p.timestamp("created_at").defaultNow().notNull(),
        updatedAt: p
            .timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
        ipAddress: p.text("ip_address"),
        userAgent: p.text("user_agent"),
        userId: p
            .text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
    },
    (table) => [p.index("session_userId_idx").on(table.userId)],
)

export const account = p.pgTable(
    "account",
    {
        id: p.text("id").primaryKey(),
        issuer: p.text("issuer").notNull(),
        accountId: p.text("account_id").notNull(),
        providerId: p.text("provider_id").notNull(),
        userId: p
            .text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: p.text("access_token"),
        refreshToken: p.text("refresh_token"),
        idToken: p.text("id_token"),
        accessTokenExpiresAt: p.timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: p.timestamp("refresh_token_expires_at"),
        scope: p.text("scope"),
        password: p.text("password"),
        createdAt: p.timestamp("created_at").defaultNow().notNull(),
        updatedAt: p
            .timestamp("updated_at")
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        p
            .uniqueIndex("account_issuer_accountId_uidx")
            .on(table.issuer, table.accountId),
        p.index("account_userId_idx").on(table.userId),
    ],
)

export const verification = p.pgTable(
    "verification",
    {
        id: p.text("id").primaryKey(),
        identifier: p.text("identifier").notNull(),
        value: p.text("value").notNull(),
        expiresAt: p.timestamp("expires_at").notNull(),
        createdAt: p.timestamp("created_at").defaultNow().notNull(),
        updatedAt: p
            .timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [p.index("verification_identifier_idx").on(table.identifier)],
)

export const antrian = p.pgTable(
    "antrian",
    {
        id: p.serial("id").primaryKey(),
        userId: p.text("user_id").notNull(),
        jenisLayanan: p.text("jenis_layanan").notNull(),
        nomorAntri: p.integer("nomor_antri").notNull(),
        tanggal: p.date("tanggal").notNull(),
        appointmentTime: p.timestamp("appointment_time").notNull(),
        status: p
            .text("status", {
                enum: ["waiting", "in_progress", "done"],
            })
            .notNull()
            .default("waiting"),
        createdAt: p.timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [
        p.index("antrian_tanggal_idx").on(t.tanggal),
        p
            .index("antrian_user_tanggal_status_idx")
            .on(t.userId, t.tanggal, t.status),
    ],
)

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}))

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}))
