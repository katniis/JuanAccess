ALTER TABLE "station_assignments" DROP CONSTRAINT "station_assignments_qFIAV1b2V1Vh_fkey";--> statement-breakpoint
DROP TABLE "station_assignments";--> statement-breakpoint
DROP TABLE "ape_booking_procedures";--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_ape_package_id_ape_packages_id_fkey";--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_arrival_window_id_arrival_windows_id_fkey";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "ape_package_id";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "arrival_window_id";--> statement-breakpoint
ALTER TABLE "ape_package_procedures" DROP CONSTRAINT "ape_package_procedures_package_id_ape_packages_id_fkey";--> statement-breakpoint
DROP TABLE "ape_package_procedures";--> statement-breakpoint
DROP TABLE "ape_packages";--> statement-breakpoint
DROP TABLE "arrival_windows";--> statement-breakpoint
ALTER TABLE "fee_schedule" DROP CONSTRAINT "fee_schedule_capacity_per_window_check";--> statement-breakpoint
ALTER TABLE "fee_schedule" DROP CONSTRAINT "fee_schedule_offered_days_check";--> statement-breakpoint
ALTER TABLE "fee_schedule" DROP CONSTRAINT "fee_schedule_allowed_professions_check";--> statement-breakpoint
ALTER TABLE "fee_schedule" DROP COLUMN "offered_days";--> statement-breakpoint
ALTER TABLE "fee_schedule" DROP COLUMN "capacity_per_window";--> statement-breakpoint
ALTER TABLE "fee_schedule" DROP COLUMN "allowed_professions";--> statement-breakpoint
DELETE FROM "visit_types" WHERE "name" = 'Annual Physical Examination' AND NOT EXISTS (SELECT 1 FROM "appointments" a WHERE a."visit_type_id" = "visit_types"."id");
