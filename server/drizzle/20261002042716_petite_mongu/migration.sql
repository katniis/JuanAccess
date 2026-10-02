CREATE TABLE "equipment" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"equipment_type" varchar(50),
	"patient_id" integer
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"room_type" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "visit_types" (
	"id" serial PRIMARY KEY,
	"name" varchar(150) NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"required_specialty" varchar(100),
	"equipment_id" integer
);
--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");--> statement-breakpoint
ALTER TABLE "visit_types" ADD CONSTRAINT "visit_types_equipment_id_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id");