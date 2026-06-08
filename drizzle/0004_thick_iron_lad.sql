CREATE TYPE "public"."check_applies" AS ENUM('model', 'source', 'column');--> statement-breakpoint
CREATE TYPE "public"."check_severity" AS ENUM('error', 'warn');--> statement-breakpoint
CREATE TYPE "public"."conformance_status" AS ENUM('pass', 'warn', 'fail', 'na');--> statement-breakpoint
CREATE TYPE "public"."cost_method" AS ENUM('flat', 'per_unit', 'tiered');--> statement-breakpoint
CREATE TYPE "public"."cost_scope" AS ENUM('source', 'model', 'global');--> statement-breakpoint
CREATE TYPE "public"."cost_usage_source" AS ENUM('manual', 'run_results', 'import');--> statement-breakpoint
CREATE TYPE "public"."remediation_status" AS ENUM('open', 'in_progress', 'done', 'wontfix');--> statement-breakpoint
CREATE TABLE "conformance_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"principle_page_id" uuid,
	"applies_to" "check_applies" DEFAULT 'model' NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"severity" "check_severity" DEFAULT 'error' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conformance_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"check_key" text NOT NULL,
	"status" "conformance_status" NOT NULL,
	"detail" text,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "cost_scope" NOT NULL,
	"node_id" uuid,
	"unit" text,
	"method" "cost_method" DEFAULT 'per_unit' NOT NULL,
	"fixed_cost" numeric(14, 4),
	"per_unit_rate" numeric(18, 8),
	"tiers" jsonb,
	"currency" text DEFAULT 'USD' NOT NULL,
	"notes" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"period" date NOT NULL,
	"cost" numeric(18, 4) DEFAULT '0' NOT NULL,
	"unit" text,
	"units" numeric(20, 4),
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"period" date NOT NULL,
	"units" numeric(20, 4) DEFAULT '0' NOT NULL,
	"source" "cost_usage_source" DEFAULT 'manual' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"content" jsonb,
	"owner_id" uuid,
	"concept_page_id" uuid,
	"monthly_budget" numeric(14, 2),
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_names" jsonb,
	"counts" jsonb,
	"importer_id" uuid,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remediations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"check_key" text,
	"title" text NOT NULL,
	"status" "remediation_status" DEFAULT 'open' NOT NULL,
	"assignee_id" uuid,
	"domain_id" uuid,
	"note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "domain_id" uuid;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "dbt_unique_id" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "domain_id" uuid;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "dbt_unique_id" text;--> statement-breakpoint
ALTER TABLE "conformance_checks" ADD CONSTRAINT "conformance_checks_principle_page_id_pages_id_fk" FOREIGN KEY ("principle_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_concept_page_id_pages_id_fk" FOREIGN KEY ("concept_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediations" ADD CONSTRAINT "remediations_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conformance_checks_key_idx" ON "conformance_checks" USING btree ("key");--> statement-breakpoint
CREATE INDEX "conformance_results_run_idx" ON "conformance_results" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "conformance_results_node_idx" ON "conformance_results" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "cost_configs_scope_node_idx" ON "cost_configs" USING btree ("scope","node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cost_facts_unique_idx" ON "cost_facts" USING btree ("node_type","node_id","period");--> statement-breakpoint
CREATE INDEX "cost_facts_node_idx" ON "cost_facts" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "cost_facts_period_idx" ON "cost_facts" USING btree ("period");--> statement-breakpoint
CREATE UNIQUE INDEX "cost_usage_unique_idx" ON "cost_usage" USING btree ("node_type","node_id","period");--> statement-breakpoint
CREATE INDEX "cost_usage_period_idx" ON "cost_usage" USING btree ("period");--> statement-breakpoint
CREATE UNIQUE INDEX "domains_slug_idx" ON "domains" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "remediations_status_idx" ON "remediations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "remediations_node_idx" ON "remediations" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "remediations_domain_idx" ON "remediations" USING btree ("domain_id");--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "models_domain_idx" ON "models" USING btree ("domain_id");--> statement-breakpoint
CREATE UNIQUE INDEX "models_dbt_unique_idx" ON "models" USING btree ("dbt_unique_id");--> statement-breakpoint
CREATE INDEX "sources_domain_idx" ON "sources" USING btree ("domain_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_dbt_unique_idx" ON "sources" USING btree ("dbt_unique_id");