CREATE TABLE "arrival_windows" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "arrival_windows_hours_check" CHECK ("start_time" < "end_time")
);
--> statement-breakpoint
ALTER TABLE "fee_schedule" ADD COLUMN "offered_days" smallint[] DEFAULT '{}'::smallint[] NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_schedule" ADD COLUMN "capacity_per_window" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_schedule" ADD CONSTRAINT "fee_schedule_capacity_per_window_check" CHECK ("capacity_per_window" >= 0);--> statement-breakpoint
ALTER TABLE "fee_schedule" ADD CONSTRAINT "fee_schedule_offered_days_check" CHECK ("offered_days" <@ ARRAY[0,1,2,3,4,5,6]::smallint[]);--> statement-breakpoint
REVOKE ALL ON TABLE "arrival_windows" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "arrival_windows_id_seq" FROM anon, authenticated;
ALTER TABLE "arrival_windows" ENABLE ROW LEVEL SECURITY;