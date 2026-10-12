CREATE TABLE "user_invitations" (
	"id" serial PRIMARY KEY,
	"email" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"specialty" varchar(100),
	"npi_number" varchar(20),
	"token_hash" varchar(128) NOT NULL UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"invited_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitations_role_check" CHECK ("role" IN ('staff', 'staff_admin'))
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_last_error" varchar(500);--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "appeals" DROP CONSTRAINT "appeals_status_check", ADD CONSTRAINT "appeals_status_check" CHECK ("status" IN ('drafted', 'submitted', 'manual_review', 'approved', 'denied'));--> statement-breakpoint
ALTER TABLE "prior_authorizations" DROP CONSTRAINT "prior_authorizations_status_check", ADD CONSTRAINT "prior_authorizations_status_check" CHECK ("status" IN ('not_required', 'needs_draft', 'drafted', 'submitted', 'manual_review', 'approved', 'denied', 'appealed'));
--> statement-breakpoint
-- The Express API is the only data access path. Supabase browser roles must not
-- read or write clinical tables directly; the server connection retains access.
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
DO $$
DECLARE
   table_name text;
BEGIN
   FOR table_name IN
      SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'
   LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
   END LOOP;
END $$;
