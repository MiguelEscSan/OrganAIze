CREATE TABLE "requests" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"singleton" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"max_attempts" integer NOT NULL,
	"max_minutes" integer NOT NULL,
	"max_tokens" integer NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."singleton" = true)
);
--> statement-breakpoint
CREATE TABLE "task_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "task_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"task_id" text NOT NULL,
	"from_status" varchar(16) NOT NULL,
	"to_status" varchar(16) NOT NULL,
	"actor" varchar(8) NOT NULL,
	"reason" text NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"position" integer GENERATED ALWAYS AS IDENTITY (sequence name "tasks_position_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"request_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" varchar(16) NOT NULL,
	"assigned_agent" varchar(16),
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_feedback" text,
	"review_reason" varchar(16),
	CONSTRAINT "tasks_status_valid" CHECK ("tasks"."status" in ('definition', 'ready', 'in_progress', 'qa', 'deploy', 'review'))
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_one_in_progress" ON "tasks" USING btree ("status") WHERE "tasks"."status" = 'in_progress';