/**
 * taro — full data model (SPEC §5).
 *
 * Every meaningful object is a node in one knowledge graph. The polymorphic
 * `links` table is the graph glue: any node can reference any other node, and
 * backlinks ("referenced by") are read off the same rows. `relationships` is
 * shared by the catalog and the ERD — diagrams store only layout, never table
 * truth.
 *
 * Content columns are `jsonb` (TipTap document JSON) so they stay queryable and
 * linkable. `search_tsv` columns are generated `tsvector`s with GIN indexes;
 * `pg_trgm` backs fuzzy search (see drizzle/0000_*_extensions or supabase setup).
 */
import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Custom types & shared column helpers                                        */
/* -------------------------------------------------------------------------- */

/** Postgres `tsvector` — Drizzle has no native type, so declare a thin one. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

const id = () => uuid("id").primaryKey().defaultRandom();

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

export const roleEnum = pgEnum("role", ["owner", "viewer"]);
export const visibilityEnum = pgEnum("visibility", [
  "private",
  "viewer",
  "public",
]);
export const pageKindEnum = pgEnum("page_kind", ["wiki", "concept"]);
export const postKindEnum = pgEnum("post_kind", ["blog", "decision"]);
export const postStatusEnum = pgEnum("post_status", ["draft", "published"]);
export const decisionStatusEnum = pgEnum("decision_status", [
  "proposed",
  "accepted",
  "superseded",
]);
export const modelLayerEnum = pgEnum("model_layer", [
  "staging",
  "intermediate",
  "marts",
]);
export const materializationEnum = pgEnum("materialization", [
  "view",
  "table",
  "incremental",
  "ephemeral",
]);
export const columnParentEnum = pgEnum("column_parent_type", [
  "model",
  "source",
]);
export const cardinalityEnum = pgEnum("cardinality", [
  "one_to_one",
  "one_to_many",
  "many_to_many",
]);

/**
 * Polymorphic node kinds — the vocabulary shared by `links`, `taggables`,
 * `revisions`, and `attachments`. Mirrors the node table in SPEC §3.
 */
export const nodeTypeEnum = pgEnum("node_type", [
  "page",
  "post",
  "source",
  "model",
  "column",
  "diagram",
  "tag",
  "case_study",
  "task",
]);

export const caseStudyTrackEnum = pgEnum("case_study_track", [
  "technical",
  "business",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
]);
export const taskKindEnum = pgEnum("task_kind", ["baseline", "improvement"]);

/* -------------------------------------------------------------------------- */
/* Auth / identity                                                             */
/* -------------------------------------------------------------------------- */

/**
 * One row per signed-in user, keyed to `auth.users`. `role` drives RLS: the
 * first user to sign in is provisioned as `owner`, everyone else `viewer`.
 */
export const profiles = pgTable("profiles", {
  // Mirrors auth.users.id (FK enforced in SQL — auth schema is Supabase-managed).
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  role: roleEnum("role").notNull().default("viewer"),
  avatarUrl: text("avatar_url"),
  ...timestamps,
});

/* -------------------------------------------------------------------------- */
/* Knowledge                                                                   */
/* -------------------------------------------------------------------------- */

export const pages = pgTable(
  "pages",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    parentId: uuid("parent_id"),
    kind: pageKindEnum("kind").notNull().default("wiki"),
    content: jsonb("content"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content::text, ''))`,
    ),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pages_slug_idx").on(t.slug),
    index("pages_parent_idx").on(t.parentId),
    index("pages_kind_idx").on(t.kind),
    index("pages_search_idx").using("gin", t.searchTsv),
    index("pages_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    kind: postKindEnum("kind").notNull().default("blog"),
    status: postStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    content: jsonb("content"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content::text, ''))`,
    ),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("posts_slug_idx").on(t.slug),
    index("posts_kind_idx").on(t.kind),
    index("posts_status_idx").on(t.status),
    index("posts_search_idx").using("gin", t.searchTsv),
    index("posts_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
  ],
);

/** Structured ADR fields for `posts.kind = 'decision'`. */
export const decisionMeta = pgTable("decision_meta", {
  id: id(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  context: text("context"),
  decision: text("decision"),
  consequences: text("consequences"),
  status: decisionStatusEnum("status").notNull().default("proposed"),
  supersedesId: uuid("supersedes_id"),
  ...timestamps,
});

/* -------------------------------------------------------------------------- */
/* Taxonomy & graph                                                            */
/* -------------------------------------------------------------------------- */

export const tags = pgTable(
  "tags",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color"),
    ...timestamps,
  },
  (t) => [uniqueIndex("tags_slug_idx").on(t.slug)],
);

/** Polymorphic tag attachment: ties a `tag` to any node. */
export const taggables = pgTable(
  "taggables",
  {
    id: id(),
    nodeType: nodeTypeEnum("node_type").notNull(),
    nodeId: uuid("node_id").notNull(),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("taggables_unique_idx").on(t.nodeType, t.nodeId, t.tagId),
    index("taggables_node_idx").on(t.nodeType, t.nodeId),
    index("taggables_tag_idx").on(t.tagId),
  ],
);

/**
 * The backlink graph. Polymorphic on both ends so *any* node can reference
 * *any* node — powers `[[wikilinks]]`, "referenced by", and concept↔catalog
 * links. Indexed in both directions.
 */
export const links = pgTable(
  "links",
  {
    id: id(),
    sourceType: nodeTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    targetType: nodeTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    context: text("context"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("links_unique_idx").on(
      t.sourceType,
      t.sourceId,
      t.targetType,
      t.targetId,
    ),
    index("links_source_idx").on(t.sourceType, t.sourceId),
    index("links_target_idx").on(t.targetType, t.targetId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

export const sources = pgTable(
  "sources",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description"),
    system: text("system"),
    freshnessSla: text("freshness_sla"),
    expectedVolume: text("expected_volume"),
    monitoringNotes: text("monitoring_notes"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    ...timestamps,
  },
  (t) => [index("sources_name_idx").on(t.name)],
);

export const models = pgTable(
  "models",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description"),
    layer: modelLayerEnum("layer").notNull().default("staging"),
    materialization: materializationEnum("materialization")
      .notNull()
      .default("view"),
    grain: text("grain"),
    ownerId: uuid("owner_id"),
    sqlNotes: text("sql_notes"),
    freshnessSla: text("freshness_sla"),
    expectedVolume: text("expected_volume"),
    monitoringNotes: text("monitoring_notes"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    ...timestamps,
  },
  (t) => [
    index("models_name_idx").on(t.name),
    index("models_layer_idx").on(t.layer),
    index("models_materialization_idx").on(t.materialization),
  ],
);

/** A field on a Model or Source. `tests` holds inline dbt-style test config. */
export const columns = pgTable(
  "columns",
  {
    id: id(),
    parentType: columnParentEnum("parent_type").notNull(),
    parentId: uuid("parent_id").notNull(),
    name: text("name").notNull(),
    dataType: text("data_type"),
    description: text("description"),
    isPk: boolean("is_pk").notNull().default(false),
    isFk: boolean("is_fk").notNull().default(false),
    position: integer("position").notNull().default(0),
    tests: jsonb("tests").notNull().default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (t) => [index("columns_parent_idx").on(t.parentType, t.parentId)],
);

/** Lineage edges: `upstream` feeds `downstream`. */
export const modelDependencies = pgTable(
  "model_dependencies",
  {
    id: id(),
    upstreamId: uuid("upstream_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    downstreamId: uuid("downstream_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("model_deps_unique_idx").on(t.upstreamId, t.downstreamId),
    index("model_deps_upstream_idx").on(t.upstreamId),
    index("model_deps_downstream_idx").on(t.downstreamId),
  ],
);

/**
 * First-class relationships between models — shared by the catalog and the ERD.
 * A diagram references these; it never stores the relationship itself.
 */
export const relationships = pgTable(
  "relationships",
  {
    id: id(),
    fromModelId: uuid("from_model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    fromColumnId: uuid("from_column_id").references(() => columns.id, {
      onDelete: "set null",
    }),
    toModelId: uuid("to_model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    toColumnId: uuid("to_column_id").references(() => columns.id, {
      onDelete: "set null",
    }),
    cardinality: cardinalityEnum("cardinality").notNull().default("one_to_many"),
    ...timestamps,
  },
  (t) => [
    index("relationships_from_idx").on(t.fromModelId),
    index("relationships_to_idx").on(t.toModelId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Diagrams (ERD)                                                              */
/* -------------------------------------------------------------------------- */

export const diagrams = pgTable("diagrams", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  visibility: visibilityEnum("visibility").notNull().default("private"),
  ...timestamps,
});

/** Per-diagram layout for a model node — position/size only, never schema. */
export const diagramNodes = pgTable(
  "diagram_nodes",
  {
    id: id(),
    diagramId: uuid("diagram_id")
      .notNull()
      .references(() => diagrams.id, { onDelete: "cascade" }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    x: doublePrecision("x").notNull().default(0),
    y: doublePrecision("y").notNull().default(0),
    w: doublePrecision("w"),
    h: doublePrecision("h"),
    collapsed: boolean("collapsed").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("diagram_nodes_unique_idx").on(t.diagramId, t.modelId),
    index("diagram_nodes_diagram_idx").on(t.diagramId),
  ],
);

export const diagramEdges = pgTable(
  "diagram_edges",
  {
    id: id(),
    diagramId: uuid("diagram_id")
      .notNull()
      .references(() => diagrams.id, { onDelete: "cascade" }),
    relationshipId: uuid("relationship_id").references(() => relationships.id, {
      onDelete: "cascade",
    }),
    // Optional explicit endpoints when an edge isn't backed by a relationship.
    fromModelId: uuid("from_model_id").references(() => models.id, {
      onDelete: "cascade",
    }),
    toModelId: uuid("to_model_id").references(() => models.id, {
      onDelete: "cascade",
    }),
    ...timestamps,
  },
  (t) => [index("diagram_edges_diagram_idx").on(t.diagramId)],
);

/* -------------------------------------------------------------------------- */
/* Media & history                                                             */
/* -------------------------------------------------------------------------- */

export const attachments = pgTable("attachments", {
  id: id(),
  storagePath: text("storage_path").notNull(),
  mime: text("mime"),
  nodeType: nodeTypeEnum("node_type"),
  nodeId: uuid("node_id"),
  ...timestamps,
});

/** Append-only revision history for pages/posts (lightweight; no diffing yet). */
export const revisions = pgTable(
  "revisions",
  {
    id: id(),
    nodeType: nodeTypeEnum("node_type").notNull(),
    nodeId: uuid("node_id").notNull(),
    title: text("title"),
    content: jsonb("content"),
    editorId: uuid("editor_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("revisions_node_idx").on(t.nodeType, t.nodeId)],
);

/* -------------------------------------------------------------------------- */
/* Case studies (interactive, gamified completion curriculum)                  */
/* -------------------------------------------------------------------------- */

/**
 * A scenario (e.g. ClassDojo) where the theory in Concept pages is made
 * material. Each case study seeds a curriculum of tasks across a technical and
 * a business/stakeholder track; completing them all represents a gap-free,
 * end-to-end analytics build.
 */
export const caseStudies = pgTable(
  "case_studies",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    scenario: text("scenario"),
    content: jsonb("content"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    ...timestamps,
  },
  (t) => [uniqueIndex("case_studies_slug_idx").on(t.slug)],
);

/** A single thing-to-complete inside a case study, with an editor workspace. */
export const caseStudyTasks = pgTable(
  "case_study_tasks",
  {
    id: id(),
    caseStudyId: uuid("case_study_id")
      .notNull()
      .references(() => caseStudies.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    track: caseStudyTrackEnum("track").notNull().default("technical"),
    category: text("category"),
    title: text("title").notNull(),
    description: text("description"),
    content: jsonb("content"),
    status: taskStatusEnum("status").notNull().default("todo"),
    kind: taskKindEnum("kind").notNull().default("baseline"),
    position: integer("position").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("case_study_tasks_study_idx").on(t.caseStudyId),
    uniqueIndex("case_study_tasks_slug_idx").on(t.caseStudyId, t.slug),
  ],
);

/* -------------------------------------------------------------------------- */
/* Inferred types                                                              */
/* -------------------------------------------------------------------------- */

export type Profile = typeof profiles.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type DecisionMeta = typeof decisionMeta.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Link = typeof links.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type Model = typeof models.$inferSelect;
export type Column = typeof columns.$inferSelect;
export type Relationship = typeof relationships.$inferSelect;
export type Diagram = typeof diagrams.$inferSelect;
export type DiagramNode = typeof diagramNodes.$inferSelect;
export type DiagramEdge = typeof diagramEdges.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Revision = typeof revisions.$inferSelect;
export type CaseStudy = typeof caseStudies.$inferSelect;
export type CaseStudyTask = typeof caseStudyTasks.$inferSelect;
export type NodeType = (typeof nodeTypeEnum.enumValues)[number];
export type CaseStudyTrack = (typeof caseStudyTrackEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type TaskKind = (typeof taskKindEnum.enumValues)[number];
