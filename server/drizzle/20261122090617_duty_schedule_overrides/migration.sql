CREATE TABLE "duty_schedule_overrides" (
	"id" serial PRIMARY KEY,
	"provider_id" integer NOT NULL,
	"override_date" date NOT NULL,
	"is_day_off" boolean DEFAULT false NOT NULL,
	"start_time" time,
	"end_time" time,
	CONSTRAINT "duty_schedule_overrides_provider_date_unique" UNIQUE("provider_id","override_date"),
	CONSTRAINT "duty_schedule_overrides_hours_check" CHECK ("is_day_off" OR ("start_time" IS NOT NULL AND "end_time" IS NOT NULL AND "start_time" < "end_time"))
);
--> statement-breakpoint
ALTER TABLE "duty_schedule_overrides" ADD CONSTRAINT "duty_schedule_overrides_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE;
--> statement-breakpoint
REVOKE ALL ON TABLE "duty_schedule_overrides" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "duty_schedule_overrides_id_seq" FROM anon, authenticated;