DELETE FROM "requests";--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "board_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;