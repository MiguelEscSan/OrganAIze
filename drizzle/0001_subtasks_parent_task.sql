DROP INDEX "tasks_one_in_progress";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_one_request_in_progress" ON "tasks" USING btree ("status") WHERE "tasks"."status" = 'in_progress' and "tasks"."parent_task_id" is null;