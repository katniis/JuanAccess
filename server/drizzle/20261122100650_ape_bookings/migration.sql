CREATE TABLE "ape_booking_procedures" (
	"id" serial PRIMARY KEY,
	"appointment_id" integer NOT NULL,
	"fee_schedule_id" integer NOT NULL,
	"procedure_code" varchar(20) NOT NULL,
	CONSTRAINT "ape_booking_procedures_appointment_id_fee_schedule_id_unique" UNIQUE("appointment_id","fee_schedule_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "ape_package_id" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "arrival_window_id" integer;--> statement-breakpoint
CREATE INDEX "ape_booking_procedures_fee_schedule_idx" ON "ape_booking_procedures" ("fee_schedule_id");--> statement-breakpoint
ALTER TABLE "ape_booking_procedures" ADD CONSTRAINT "ape_booking_procedures_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ape_booking_procedures" ADD CONSTRAINT "ape_booking_procedures_fee_schedule_id_fee_schedule_id_fkey" FOREIGN KEY ("fee_schedule_id") REFERENCES "fee_schedule"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_ape_package_id_ape_packages_id_fkey" FOREIGN KEY ("ape_package_id") REFERENCES "ape_packages"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_arrival_window_id_arrival_windows_id_fkey" FOREIGN KEY ("arrival_window_id") REFERENCES "arrival_windows"("id");--> statement-breakpoint
REVOKE ALL ON TABLE "ape_booking_procedures" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "ape_booking_procedures_id_seq" FROM anon, authenticated;
ALTER TABLE "ape_booking_procedures" ENABLE ROW LEVEL SECURITY;
