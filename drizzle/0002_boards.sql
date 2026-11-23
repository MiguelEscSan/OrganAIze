CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"root_path" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "boards_root_path" ON "boards" USING btree ("root_path");