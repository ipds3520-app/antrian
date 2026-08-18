CREATE TABLE "antrian" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" text,
	"jenis_layanan" text NOT NULL,
	"nomor_antri" integer NOT NULL,
	"appointment_time" timestamp NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(70) NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'client' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
