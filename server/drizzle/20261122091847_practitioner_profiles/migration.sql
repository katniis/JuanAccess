ALTER TABLE "providers" ADD COLUMN "profession" varchar(30) DEFAULT 'physician' NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "education" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "prc_license_number" varchar(7);--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "board_certifications" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "practice_start_year" integer;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "background" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "consultation_fee" numeric(10,2);--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_profession_check" CHECK ("profession" IN ('physician', 'nurse', 'medical_technologist', 'radiologic_technologist'));