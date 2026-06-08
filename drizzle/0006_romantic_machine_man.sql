CREATE TYPE "public"."metric_type" AS ENUM('simple', 'ratio', 'derived', 'cumulative');--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"label" text,
	"description" text,
	"type" "metric_type" DEFAULT 'simple' NOT NULL,
	"model_id" uuid,
	"expression" text,
	"detect" text,
	"numerator_id" uuid,
	"denominator_id" uuid,
	"window" text,
	"domain_id" uuid,
	"owner_id" uuid,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "metrics_name_idx" ON "metrics" USING btree ("name");--> statement-breakpoint
CREATE INDEX "metrics_model_idx" ON "metrics" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "metrics_domain_idx" ON "metrics" USING btree ("domain_id");