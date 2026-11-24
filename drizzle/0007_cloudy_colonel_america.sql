CREATE TABLE "agent_activity" (
	"agent" varchar(16) PRIMARY KEY NOT NULL,
	"state" varchar(16) NOT NULL,
	"message" text NOT NULL
);
