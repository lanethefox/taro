CREATE TYPE "public"."case_study_track" AS ENUM('technical', 'business');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('baseline', 'improvement');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
ALTER TYPE "public"."node_type" ADD VALUE 'case_study';--> statement-breakpoint
ALTER TYPE "public"."node_type" ADD VALUE 'task';--> statement-breakpoint
CREATE TABLE "case_studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"scenario" text,
	"content" jsonb,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_study_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_study_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"track" "case_study_track" DEFAULT 'technical' NOT NULL,
	"category" text,
	"title" text NOT NULL,
	"description" text,
	"content" jsonb,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"kind" "task_kind" DEFAULT 'baseline' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_study_tasks" ADD CONSTRAINT "case_study_tasks_case_study_id_case_studies_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_studies_slug_idx" ON "case_studies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "case_study_tasks_study_idx" ON "case_study_tasks" USING btree ("case_study_id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_study_tasks_slug_idx" ON "case_study_tasks" USING btree ("case_study_id","slug");