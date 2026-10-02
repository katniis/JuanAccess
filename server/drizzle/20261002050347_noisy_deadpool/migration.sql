CREATE TABLE "provider_availability" (
	"id" serial PRIMARY KEY,
	"provider_id" integer,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	CONSTRAINT "day_of_week_check" CHECK ("day_of_week" BETWEEN 0 AND 6)
);
--> statement-breakpoint
ALTER TABLE "provider_availability" ADD CONSTRAINT "provider_availability_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id");