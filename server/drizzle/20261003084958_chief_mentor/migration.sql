CREATE TABLE IF NOT EXISTS "appeals" (
	"id" serial PRIMARY KEY,
	"prior_authorization_id" integer NOT NULL,
	"guideline_id" integer,
	"chart_justification_text" text,
	"appeal_letter_text" text,
	"status" varchar(20) DEFAULT 'drafted' NOT NULL,
	"reviewed_by" integer,
	"submitted_by" integer,
	"submitted_at" timestamp with time zone,
	"decision_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appeals_status_check" CHECK ("status" IN ('drafted', 'submitted', 'approved', 'denied'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" serial PRIMARY KEY,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"changed_by" integer,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chart_notes" (
	"id" serial PRIMARY KEY,
	"patient_id" integer NOT NULL,
	"appointment_id" integer,
	"provider_id" integer,
	"note_text" text NOT NULL,
	"encounter_date" timestamp with time zone NOT NULL,
	"synthea_encounter_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical_guidelines" (
	"id" serial PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"excerpt_text" text NOT NULL,
	"applicable_visit_type_id" integer,
	"applicable_diagnosis_code" varchar(50),
	"source_citation" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conditions" (
	"id" serial PRIMARY KEY,
	"patient_id" integer NOT NULL,
	"condition_code" varchar(20) NOT NULL,
	"description" varchar(255) NOT NULL,
	"diagnosed_date" date,
	"resolved_date" date,
	"synthea_condition_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "labs" (
	"id" serial PRIMARY KEY,
	"patient_id" integer NOT NULL,
	"appointment_id" integer,
	"test_name" varchar(150) NOT NULL,
	"result_value" varchar(100),
	"unit" varchar(30),
	"reference_range" varchar(100),
	"result_date" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medications" (
	"id" serial PRIMARY KEY,
	"patient_id" integer NOT NULL,
	"medication_name" varchar(150) NOT NULL,
	"dose" varchar(100),
	"start_date" date NOT NULL,
	"end_date" date,
	"prescribing_provider_id" integer
);
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'insurance_plans' AND column_name = 'insurer_name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'insurance_plans' AND column_name = 'payer_name') THEN
    ALTER TABLE "insurance_plans" RENAME COLUMN "insurer_name" TO "payer_name";
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'visit_types' AND column_name = 'equipment_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'visit_types' AND column_name = 'required_equipment_id') THEN
    ALTER TABLE "visit_types" RENAME COLUMN "equipment_id" TO "required_equipment_id";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "insurance_plans" ADD COLUMN IF NOT EXISTS "plan_type" varchar(50);
--> statement-breakpoint
ALTER TABLE "insurance_plans" ADD COLUMN IF NOT EXISTS "coverage_pct" numeric(5,2);
--> statement-breakpoint
ALTER TABLE "patient_coverage" ADD COLUMN IF NOT EXISTS "effective_date" date;
--> statement-breakpoint
ALTER TABLE "prior_authorizations" ADD COLUMN IF NOT EXISTS "justification_text" text;
--> statement-breakpoint
ALTER TABLE "prior_authorizations" ADD COLUMN IF NOT EXISTS "ai_generated_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "prior_authorizations" ADD COLUMN IF NOT EXISTS "reviewed_by" integer;
--> statement-breakpoint
ALTER TABLE "prior_authorizations" ADD COLUMN IF NOT EXISTS "submitted_by" integer;
--> statement-breakpoint
ALTER TABLE "prior_authorizations" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "prior_authorizations" ADD COLUMN IF NOT EXISTS "decision_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "prior_authorizations" ADD COLUMN IF NOT EXISTS "denial_reason" text;
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "patient_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "provider_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "room_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "visit_type_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at"::timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "prior_auth_rules" ALTER COLUMN "requires_prior_auth" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "prior_authorizations" ALTER COLUMN "status" SET DEFAULT 'needs_draft';
--> statement-breakpoint
ALTER TABLE "provider_availability" ALTER COLUMN "provider_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.insurance_plans'::regclass AND conname = 'insurance_plans_insurer_plan_unique')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.insurance_plans'::regclass AND conname = 'insurance_plans_payer_plan_unique') THEN
    ALTER TABLE "insurance_plans" RENAME CONSTRAINT "insurance_plans_insurer_plan_unique" TO "insurance_plans_payer_plan_unique";
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.appeals'::regclass
      AND fk.confrelid = 'public.prior_authorizations'::regclass
      AND source_column.attname = 'prior_authorization_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "appeals" ADD CONSTRAINT "appeals_prior_authorization_id_prior_authorizations_id_fkey" FOREIGN KEY ("prior_authorization_id") REFERENCES "prior_authorizations"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.appeals'::regclass
      AND fk.confrelid = 'public.clinical_guidelines'::regclass
      AND source_column.attname = 'guideline_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "appeals" ADD CONSTRAINT "appeals_guideline_id_clinical_guidelines_id_fkey" FOREIGN KEY ("guideline_id") REFERENCES "clinical_guidelines"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.appeals'::regclass
      AND fk.confrelid = 'public.users'::regclass
      AND source_column.attname = 'reviewed_by' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "appeals" ADD CONSTRAINT "appeals_reviewed_by_users_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.appeals'::regclass
      AND fk.confrelid = 'public.users'::regclass
      AND source_column.attname = 'submitted_by' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "appeals" ADD CONSTRAINT "appeals_submitted_by_users_id_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.audit_log'::regclass
      AND fk.confrelid = 'public.users'::regclass
      AND source_column.attname = 'changed_by' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_changed_by_users_id_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.chart_notes'::regclass
      AND fk.confrelid = 'public.patients'::regclass
      AND source_column.attname = 'patient_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "chart_notes" ADD CONSTRAINT "chart_notes_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.chart_notes'::regclass
      AND fk.confrelid = 'public.appointments'::regclass
      AND source_column.attname = 'appointment_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "chart_notes" ADD CONSTRAINT "chart_notes_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.chart_notes'::regclass
      AND fk.confrelid = 'public.providers'::regclass
      AND source_column.attname = 'provider_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "chart_notes" ADD CONSTRAINT "chart_notes_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.clinical_guidelines'::regclass
      AND fk.confrelid = 'public.visit_types'::regclass
      AND source_column.attname = 'applicable_visit_type_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "clinical_guidelines" ADD CONSTRAINT "clinical_guidelines_cm9eBc7rkraS_fkey" FOREIGN KEY ("applicable_visit_type_id") REFERENCES "visit_types"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.conditions'::regclass
      AND fk.confrelid = 'public.patients'::regclass
      AND source_column.attname = 'patient_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "conditions" ADD CONSTRAINT "conditions_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.labs'::regclass
      AND fk.confrelid = 'public.patients'::regclass
      AND source_column.attname = 'patient_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "labs" ADD CONSTRAINT "labs_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.labs'::regclass
      AND fk.confrelid = 'public.appointments'::regclass
      AND source_column.attname = 'appointment_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "labs" ADD CONSTRAINT "labs_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.medications'::regclass
      AND fk.confrelid = 'public.patients'::regclass
      AND source_column.attname = 'patient_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "medications" ADD CONSTRAINT "medications_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.medications'::regclass
      AND fk.confrelid = 'public.providers'::regclass
      AND source_column.attname = 'prescribing_provider_id' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "medications" ADD CONSTRAINT "medications_prescribing_provider_id_providers_id_fkey" FOREIGN KEY ("prescribing_provider_id") REFERENCES "providers"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.prior_authorizations'::regclass
      AND fk.confrelid = 'public.users'::regclass
      AND source_column.attname = 'reviewed_by' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_reviewed_by_users_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS fk
    JOIN pg_attribute AS source_column ON source_column.attrelid = fk.conrelid AND source_column.attnum = ANY(fk.conkey)
    JOIN pg_attribute AS target_column ON target_column.attrelid = fk.confrelid AND target_column.attnum = ANY(fk.confkey)
    WHERE fk.contype = 'f' AND fk.conrelid = 'public.prior_authorizations'::regclass
      AND fk.confrelid = 'public.users'::regclass
      AND source_column.attname = 'submitted_by' AND target_column.attname = 'id'
  ) THEN
    ALTER TABLE "prior_authorizations" ADD CONSTRAINT "prior_authorizations_submitted_by_users_id_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id");
  END IF;
END $$;
