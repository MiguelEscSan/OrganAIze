ALTER TABLE "tasks" ADD COLUMN "acceptance_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "files" jsonb DEFAULT '[]'::jsonb NOT NULL;