CREATE TABLE "enrolment_codes" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"issued_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "enrolment_codes_user_idx" ON "enrolment_codes" ("user_id");--> statement-breakpoint
ALTER TABLE "enrolment_codes" ADD CONSTRAINT "enrolment_codes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "enrolment_codes" ADD CONSTRAINT "enrolment_codes_issued_by_user_id_users_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
REVOKE ALL ON TABLE "enrolment_codes" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON SEQUENCE "enrolment_codes_id_seq" FROM anon, authenticated;--> statement-breakpoint
ALTER TABLE "enrolment_codes" ENABLE ROW LEVEL SECURITY;