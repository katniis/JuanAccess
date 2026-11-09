CREATE TABLE "account_action_tokens" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"purpose" varchar(30) NOT NULL,
	"token_hash" varchar(64) NOT NULL UNIQUE,
	"pending_email" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_action_tokens_purpose_check" CHECK ("purpose" IN ('password_reset', 'email_change')),
	CONSTRAINT "account_action_tokens_email_check" CHECK (("purpose" = 'email_change' AND "pending_email" IS NOT NULL) OR ("purpose" = 'password_reset' AND "pending_email" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "account_action_tokens_user_purpose_idx" ON "account_action_tokens" ("user_id","purpose");--> statement-breakpoint
ALTER TABLE "account_action_tokens" ADD CONSTRAINT "account_action_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
REVOKE ALL ON TABLE "account_action_tokens" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "account_action_tokens_id_seq" FROM anon, authenticated;
ALTER TABLE "account_action_tokens" ENABLE ROW LEVEL SECURITY;
