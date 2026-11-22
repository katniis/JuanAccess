CREATE TABLE "ape_package_procedures" (
	"id" serial PRIMARY KEY,
	"package_id" integer NOT NULL,
	"fee_schedule_id" integer NOT NULL,
	"sex_at_birth" varchar(10),
	CONSTRAINT "ape_package_procedures_package_id_fee_schedule_id_unique" UNIQUE("package_id","fee_schedule_id")
);
--> statement-breakpoint
CREATE TABLE "ape_packages" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL UNIQUE,
	"package_price" numeric(10,2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ape_package_procedures" ADD CONSTRAINT "ape_package_procedures_package_id_ape_packages_id_fkey" FOREIGN KEY ("package_id") REFERENCES "ape_packages"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ape_package_procedures" ADD CONSTRAINT "ape_package_procedures_fee_schedule_id_fee_schedule_id_fkey" FOREIGN KEY ("fee_schedule_id") REFERENCES "fee_schedule"("id");--> statement-breakpoint
REVOKE ALL ON TABLE "ape_packages" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "ape_packages_id_seq" FROM anon, authenticated;
ALTER TABLE "ape_packages" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ape_package_procedures" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "ape_package_procedures_id_seq" FROM anon, authenticated;
ALTER TABLE "ape_package_procedures" ENABLE ROW LEVEL SECURITY;