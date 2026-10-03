CREATE TABLE "prior_auth_rules" (
	"id" serial PRIMARY KEY,
	"visit_type_id" integer NOT NULL,
	"insurance_plan_id" integer,
	"requires_prior_auth" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prior_authorizations" (
	"id" serial PRIMARY KEY,
	"appointment_id" integer NOT NULL CONSTRAINT "prior_authorizations_appointment_unique" UNIQUE,
	"status" varchar(20) NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prior_authorizations_status_check" CHECK ("status" IN ('not_required', 'needs_draft', 'drafted', 'submitted', 'approved', 'denied', 'appealed'))
);
--> statement-breakpoint
CREATE INDEX "prior_auth_rules_visit_plan_idx" ON "prior_auth_rules" ("visit_type_id","insurance_plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prior_auth_rules_specific_unique" ON "prior_auth_rules" ("visit_type_id","insurance_plan_id") WHERE "insurance_plan_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "prior_auth_rules_generic_unique" ON "prior_auth_rules" ("visit_type_id") WHERE "insurance_plan_id" IS NULL;--> statement-breakpoint
ALTER TABLE "prior_auth_rules" ADD CONSTRAINT "prior_auth_rules_visit_type_id_visit_types_id_fkey" FOREIGN KEY ("visit_type_id") REFERENCES "visit_types"("id");--> statement-breakpoint
ALTER TABLE "prior_auth_rules" ADD CONSTRAINT "prior_auth_rules_insurance_plan_id_insurance_plans_id_fkey" FOREIGN KEY ("insurance_plan_id") REFERENCES "insurance_plans"("id");--> statement-breakpoint
ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");--> statement-breakpoint
ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_updated_by_users_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id");
--> statement-breakpoint
INSERT INTO "prior_authorizations" ("appointment_id", "status")
SELECT "id", 'not_required' FROM "appointments"
ON CONFLICT ("appointment_id") DO NOTHING;
