CREATE TABLE "recovery_codes" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_secret_encrypted" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "totp_enabled_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "recovery_codes_user_idx" ON "recovery_codes" ("user_id");--> statement-breakpoint
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
REVOKE ALL ON TABLE "recovery_codes" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "recovery_codes_id_seq" FROM anon, authenticated;
ALTER TABLE "recovery_codes" ENABLE ROW LEVEL SECURITY;