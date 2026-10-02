CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY,
	"patient_id" integer,
	"provider_id" integer,
	"room_id" integer,
	"equipment_id" integer,
	"visit_type_id" integer,
	"scheduled_start" timestamp NOT NULL,
	"scheduled_end" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"insurance_status" varchar(20) DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "status_check" CHECK ("status" IN ('scheduled', 'completed', 'cancelled', 'no_show')),
	CONSTRAINT "insurance_status_check" CHECK ("insurance_status" IN ('active', 'inactive', 'unverified'))
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_room_id_rooms_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_equipment_id_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_visit_type_id_visit_types_id_fkey" FOREIGN KEY ("visit_type_id") REFERENCES "visit_types"("id");