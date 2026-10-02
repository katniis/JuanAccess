ALTER TABLE "equipment" DROP CONSTRAINT "equipment_patient_id_patients_id_fkey";--> statement-breakpoint
ALTER TABLE "equipment" RENAME COLUMN "patient_id" TO "room_id";--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_room_id_rooms_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id");