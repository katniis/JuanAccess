CREATE TABLE "insurance_plans" (
	"id" serial PRIMARY KEY,
	"insurer_name" varchar(150) NOT NULL,
	"plan_name" varchar(150) NOT NULL,
	CONSTRAINT "insurance_plans_insurer_plan_unique" UNIQUE("insurer_name","plan_name")
);
--> statement-breakpoint
CREATE TABLE "patient_coverage" (
	"id" serial PRIMARY KEY,
	"patient_id" integer NOT NULL,
	"insurance_plan_id" integer NOT NULL,
	"policy_number" varchar(100) NOT NULL,
	"member_id" varchar(100),
	"coverage_start" date,
	"coverage_end" date,
	"status" varchar(20) DEFAULT 'unverified' NOT NULL,
	"verified_by" integer,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_coverage_status_check" CHECK ("status" IN ('unverified', 'active', 'inactive')),
	CONSTRAINT "patient_coverage_date_range_check" CHECK ("coverage_start" IS NULL OR "coverage_end" IS NULL OR "coverage_start" <= "coverage_end"),
	CONSTRAINT "patient_coverage_verification_check" CHECK (("status" = 'unverified' AND "verified_by" IS NULL AND "verified_at" IS NULL) OR ("status" IN ('active', 'inactive') AND "verified_by" IS NOT NULL AND "verified_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX "patient_coverage_patient_status_idx" ON "patient_coverage" ("patient_id","status");--> statement-breakpoint
ALTER TABLE "patient_coverage" ADD CONSTRAINT "patient_coverage_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");--> statement-breakpoint
ALTER TABLE "patient_coverage" ADD CONSTRAINT "patient_coverage_insurance_plan_id_insurance_plans_id_fkey" FOREIGN KEY ("insurance_plan_id") REFERENCES "insurance_plans"("id");--> statement-breakpoint
ALTER TABLE "patient_coverage" ADD CONSTRAINT "patient_coverage_verified_by_users_id_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id");
