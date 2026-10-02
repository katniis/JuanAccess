CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" serial PRIMARY KEY,
	"patient_id" integer NOT NULL,
	"provider_id" integer,
	"visit_type_id" integer NOT NULL,
	"preferred_date_start" date NOT NULL,
	"preferred_date_end" date NOT NULL,
	"preferred_time_start" time,
	"preferred_time_end" time,
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"offered_appointment_id" integer,
	"offer_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_entries_status_check" CHECK ("status" IN ('waiting', 'offered', 'confirmed', 'expired', 'cancelled')),
	CONSTRAINT "waitlist_entries_date_range_check" CHECK ("preferred_date_start" <= "preferred_date_end"),
	CONSTRAINT "waitlist_entries_time_range_check" CHECK (("preferred_time_start" IS NULL AND "preferred_time_end" IS NULL) OR ("preferred_time_start" IS NOT NULL AND "preferred_time_end" IS NOT NULL AND "preferred_time_start" < "preferred_time_end"))
);
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "scheduled_start" SET DATA TYPE timestamp with time zone USING "scheduled_start" AT TIME ZONE 'Asia/Manila';--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "scheduled_end" SET DATA TYPE timestamp with time zone USING "scheduled_end" AT TIME ZONE 'Asia/Manila';--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_visit_type_id_visit_types_id_fkey" FOREIGN KEY ("visit_type_id") REFERENCES "visit_types"("id");--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_offered_appointment_id_appointments_id_fkey" FOREIGN KEY ("offered_appointment_id") REFERENCES "appointments"("id");
