CREATE TABLE "station_assignments" (
	"id" serial PRIMARY KEY,
	"booking_procedure_id" integer NOT NULL UNIQUE,
	"practitioner_id" integer NOT NULL,
	"assigned_by_user_id" integer NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fee_schedule" ADD COLUMN "allowed_professions" varchar(30)[] DEFAULT '{}'::varchar(30)[] NOT NULL;--> statement-breakpoint
ALTER TABLE "station_assignments" ADD CONSTRAINT "station_assignments_qFIAV1b2V1Vh_fkey" FOREIGN KEY ("booking_procedure_id") REFERENCES "ape_booking_procedures"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "station_assignments" ADD CONSTRAINT "station_assignments_practitioner_id_providers_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "station_assignments" ADD CONSTRAINT "station_assignments_assigned_by_user_id_users_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "fee_schedule" ADD CONSTRAINT "fee_schedule_allowed_professions_check" CHECK ("allowed_professions" <@ ARRAY['physician','nurse','medical_technologist','radiologic_technologist']::varchar[]);--> statement-breakpoint
REVOKE ALL ON TABLE "station_assignments" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "station_assignments_id_seq" FROM anon, authenticated;
ALTER TABLE "station_assignments" ENABLE ROW LEVEL SECURITY;