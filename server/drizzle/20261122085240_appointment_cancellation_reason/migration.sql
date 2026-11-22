ALTER TABLE "appointments" ADD COLUMN "cancellation_reason" varchar(40);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancellation_reason_text" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancelled_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancellation_letter" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_user_id_users_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id");