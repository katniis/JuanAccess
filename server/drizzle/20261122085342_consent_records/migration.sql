CREATE TABLE "consent_records" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"policy_version" varchar(50) NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "consent_records_user_version_idx" ON "consent_records" ("user_id","policy_version");--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
REVOKE ALL ON TABLE "consent_records" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "consent_records_id_seq" FROM anon, authenticated;
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;
