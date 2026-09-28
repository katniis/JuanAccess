CREATE TABLE "patients" (
	"id" serial PRIMARY KEY,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" varchar(20),
	"contact_email" varchar(255),
	"contact_phone" varchar(30),
	"address" text,
	"synthea_patient_id" varchar(100),
	"is_new_patient" boolean DEFAULT true NOT NULL,
	"intake_reason_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" serial PRIMARY KEY,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"specialty" varchar(100),
	"npi_number" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"email" varchar(255) NOT NULL UNIQUE,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"patient_id" integer,
	"provider_id" integer,
	"display_name" varchar(150) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_check" CHECK ("role" IN ('patient', 'staff', 'staff_admin'))
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");