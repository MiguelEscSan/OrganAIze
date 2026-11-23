ALTER TABLE "settings" ADD COLUMN "team_name" text DEFAULT 'Agent Team' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "auto_refresh" boolean DEFAULT true NOT NULL;