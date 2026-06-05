-- Extensions required by this schema: pg_trgm backs the fuzzy (trigram)
-- search indexes below; pgcrypto provides gen_random_uuid() for id defaults.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."cardinality" AS ENUM('one_to_one', 'one_to_many', 'many_to_many');--> statement-breakpoint
CREATE TYPE "public"."column_parent_type" AS ENUM('model', 'source');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('proposed', 'accepted', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."materialization" AS ENUM('view', 'table', 'incremental', 'ephemeral');--> statement-breakpoint
CREATE TYPE "public"."model_layer" AS ENUM('staging', 'intermediate', 'marts');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('page', 'post', 'source', 'model', 'column', 'diagram', 'tag');--> statement-breakpoint
CREATE TYPE "public"."page_kind" AS ENUM('wiki', 'concept');--> statement-breakpoint
CREATE TYPE "public"."post_kind" AS ENUM('blog', 'decision');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'viewer', 'public');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_path" text NOT NULL,
	"mime" text,
	"node_type" "node_type",
	"node_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_type" "column_parent_type" NOT NULL,
	"parent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"data_type" text,
	"description" text,
	"is_pk" boolean DEFAULT false NOT NULL,
	"is_fk" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"tests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"context" text,
	"decision" text,
	"consequences" text,
	"status" "decision_status" DEFAULT 'proposed' NOT NULL,
	"supersedes_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagram_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagram_id" uuid NOT NULL,
	"relationship_id" uuid,
	"from_model_id" uuid,
	"to_model_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagram_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagram_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"x" double precision DEFAULT 0 NOT NULL,
	"y" double precision DEFAULT 0 NOT NULL,
	"w" double precision,
	"h" double precision,
	"collapsed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagrams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "node_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"target_type" "node_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upstream_id" uuid NOT NULL,
	"downstream_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"layer" "model_layer" DEFAULT 'staging' NOT NULL,
	"materialization" "materialization" DEFAULT 'view' NOT NULL,
	"grain" text,
	"owner_id" uuid,
	"sql_notes" text,
	"freshness_sla" text,
	"expected_volume" text,
	"monitoring_notes" text,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"kind" "page_kind" DEFAULT 'wiki' NOT NULL,
	"content" jsonb,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"search_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content::text, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "post_kind" DEFAULT 'blog' NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"content" jsonb,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"search_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content::text, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"role" "role" DEFAULT 'viewer' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_model_id" uuid NOT NULL,
	"from_column_id" uuid,
	"to_model_id" uuid NOT NULL,
	"to_column_id" uuid,
	"cardinality" "cardinality" DEFAULT 'one_to_many' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"title" text,
	"content" jsonb,
	"editor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system" text,
	"freshness_sla" text,
	"expected_volume" text,
	"monitoring_notes" text,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taggables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" "node_type" NOT NULL,
	"node_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_meta" ADD CONSTRAINT "decision_meta_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_edges" ADD CONSTRAINT "diagram_edges_diagram_id_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_edges" ADD CONSTRAINT "diagram_edges_relationship_id_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_edges" ADD CONSTRAINT "diagram_edges_from_model_id_models_id_fk" FOREIGN KEY ("from_model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_edges" ADD CONSTRAINT "diagram_edges_to_model_id_models_id_fk" FOREIGN KEY ("to_model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_nodes" ADD CONSTRAINT "diagram_nodes_diagram_id_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_nodes" ADD CONSTRAINT "diagram_nodes_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_dependencies" ADD CONSTRAINT "model_dependencies_upstream_id_models_id_fk" FOREIGN KEY ("upstream_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_dependencies" ADD CONSTRAINT "model_dependencies_downstream_id_models_id_fk" FOREIGN KEY ("downstream_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_model_id_models_id_fk" FOREIGN KEY ("from_model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_column_id_columns_id_fk" FOREIGN KEY ("from_column_id") REFERENCES "public"."columns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_model_id_models_id_fk" FOREIGN KEY ("to_model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_column_id_columns_id_fk" FOREIGN KEY ("to_column_id") REFERENCES "public"."columns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taggables" ADD CONSTRAINT "taggables_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "columns_parent_idx" ON "columns" USING btree ("parent_type","parent_id");--> statement-breakpoint
CREATE INDEX "diagram_edges_diagram_idx" ON "diagram_edges" USING btree ("diagram_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diagram_nodes_unique_idx" ON "diagram_nodes" USING btree ("diagram_id","model_id");--> statement-breakpoint
CREATE INDEX "diagram_nodes_diagram_idx" ON "diagram_nodes" USING btree ("diagram_id");--> statement-breakpoint
CREATE UNIQUE INDEX "links_unique_idx" ON "links" USING btree ("source_type","source_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "links_source_idx" ON "links" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "links_target_idx" ON "links" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "model_deps_unique_idx" ON "model_dependencies" USING btree ("upstream_id","downstream_id");--> statement-breakpoint
CREATE INDEX "model_deps_upstream_idx" ON "model_dependencies" USING btree ("upstream_id");--> statement-breakpoint
CREATE INDEX "model_deps_downstream_idx" ON "model_dependencies" USING btree ("downstream_id");--> statement-breakpoint
CREATE INDEX "models_name_idx" ON "models" USING btree ("name");--> statement-breakpoint
CREATE INDEX "models_layer_idx" ON "models" USING btree ("layer");--> statement-breakpoint
CREATE INDEX "models_materialization_idx" ON "models" USING btree ("materialization");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "pages_parent_idx" ON "pages" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "pages_kind_idx" ON "pages" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "pages_search_idx" ON "pages" USING gin ("search_tsv");--> statement-breakpoint
CREATE INDEX "pages_title_trgm_idx" ON "pages" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_kind_idx" ON "posts" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_search_idx" ON "posts" USING gin ("search_tsv");--> statement-breakpoint
CREATE INDEX "posts_title_trgm_idx" ON "posts" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "relationships_from_idx" ON "relationships" USING btree ("from_model_id");--> statement-breakpoint
CREATE INDEX "relationships_to_idx" ON "relationships" USING btree ("to_model_id");--> statement-breakpoint
CREATE INDEX "revisions_node_idx" ON "revisions" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "sources_name_idx" ON "sources" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "taggables_unique_idx" ON "taggables" USING btree ("node_type","node_id","tag_id");--> statement-breakpoint
CREATE INDEX "taggables_node_idx" ON "taggables" USING btree ("node_type","node_id");--> statement-breakpoint
CREATE INDEX "taggables_tag_idx" ON "taggables" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");