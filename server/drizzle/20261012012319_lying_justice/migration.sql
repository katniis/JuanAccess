CREATE TABLE "bill_line_items" (
	"id" serial PRIMARY KEY,
	"bill_id" integer NOT NULL,
	"procedure_code" varchar(20),
	"description" varchar(255),
	"amount" numeric(10,2) NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" serial PRIMARY KEY,
	"patient_id" integer NOT NULL,
	"appointment_id" integer,
	"uploaded_file_url" varchar(500) NOT NULL,
	"upload_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	CONSTRAINT "bills_status_check" CHECK ("status" IN ('processing', 'processed', 'disputed', 'resolved'))
);
--> statement-breakpoint
CREATE TABLE "dispute_letters" (
	"id" serial PRIMARY KEY,
	"bill_id" integer NOT NULL UNIQUE,
	"letter_text" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"patient_edited" boolean DEFAULT false NOT NULL,
	"downloaded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fee_schedule" (
	"id" serial PRIMARY KEY,
	"procedure_code" varchar(20) NOT NULL UNIQUE,
	"description" varchar(255) NOT NULL,
	"standard_cost" numeric(10,2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pre_visit_summaries" (
	"id" serial PRIMARY KEY,
	"appointment_id" integer NOT NULL UNIQUE,
	"summary_text" text,
	"raw_data_snapshot" jsonb,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedures_performed" (
	"id" serial PRIMARY KEY,
	"appointment_id" integer NOT NULL,
	"procedure_code" varchar(20) NOT NULL,
	"description" varchar(255) NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bills_patient_idx" ON "bills" ("patient_id");--> statement-breakpoint
CREATE INDEX "procedures_performed_appointment_idx" ON "procedures_performed" ("appointment_id");--> statement-breakpoint
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_bill_id_bills_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id");--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_patient_id_patients_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id");--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");--> statement-breakpoint
ALTER TABLE "dispute_letters" ADD CONSTRAINT "dispute_letters_bill_id_bills_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id");--> statement-breakpoint
ALTER TABLE "pre_visit_summaries" ADD CONSTRAINT "pre_visit_summaries_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");--> statement-breakpoint
ALTER TABLE "procedures_performed" ADD CONSTRAINT "procedures_performed_appointment_id_appointments_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id");