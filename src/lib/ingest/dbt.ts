/**
 * dbt artifact parser (pure) — the bridge that turns a real dbt project into
 * taro catalog upserts. Takes the three JSON artifacts a `dbt build` produces
 * and normalizes them; the apply step (src/db/queries/ingest.ts) resolves these
 * into rows. Deterministic and dependency-free so it can be smoke-tested with
 * `node --experimental-strip-types`.
 *
 *   manifest.json    → models, sources, columns, tests, lineage, relationships
 *   catalog.json     → column data types
 *   run_results.json → per-node execution seconds (the FinOps usage signal)
 */

/* Defensive accessors — dbt artifacts are large, versioned, and partly optional. */
type J = Record<string, unknown>;
const asObj = (v: unknown): J => (v && typeof v === "object" ? (v as J) : {});
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asStr = (v: unknown): string => (typeof v === "string" ? v : "");
const asNum = (v: unknown): number => (typeof v === "number" ? v : 0);

export type ParsedColumn = {
  name: string;
  dataType: string | null;
  description: string | null;
  isPk: boolean;
  isFk: boolean;
  tests: string[];
};

export type ParsedModel = {
  dbtUniqueId: string;
  name: string;
  description: string | null;
  layer: "staging" | "intermediate" | "marts";
  materialization: "view" | "table" | "incremental" | "ephemeral";
  grain: string | null;
  ownerKey: string | null;
  domainKey: string | null;
  columns: ParsedColumn[];
  /** Upstream dbt unique_ids (models and sources). */
  dependsOn: string[];
  runSeconds: number | null;
};

export type ParsedSource = {
  dbtUniqueId: string;
  name: string;
  system: string | null;
  description: string | null;
  grain: string | null;
  domainKey: string | null;
  columns: ParsedColumn[];
  runSeconds: number | null;
};

export type ParsedRelationship = {
  fromModel: string; // dbt unique_id
  fromColumn: string;
  toModel: string; // dbt unique_id
  toColumn: string;
};

export type ParsedImport = {
  models: ParsedModel[];
  sources: ParsedSource[];
  relationships: ParsedRelationship[];
  stats: {
    models: number;
    sources: number;
    columns: number;
    dependencies: number;
    relationships: number;
    tests: number;
    withTimings: number;
  };
};

export type DbtArtifacts = {
  manifest: unknown;
  catalog?: unknown;
  runResults?: unknown;
};

const MATERIALIZATIONS = new Set(["view", "table", "incremental", "ephemeral"]);

function inferLayer(node: J): ParsedModel["layer"] {
  const path = asStr(node.path) || asStr(node.original_file_path);
  const fqn = asArr(node.fqn)
    .map((p) => asStr(p))
    .join("/");
  const hay = `${path} ${fqn}`.toLowerCase();
  const name = asStr(node.name).toLowerCase();
  if (hay.includes("staging") || name.startsWith("stg_") || name.startsWith("base_"))
    return "staging";
  if (hay.includes("intermediate") || name.startsWith("int_")) return "intermediate";
  return "marts";
}

function inferMaterialization(node: J): ParsedModel["materialization"] {
  const m = asStr(asObj(node.config).materialized).toLowerCase();
  if (MATERIALIZATIONS.has(m)) return m as ParsedModel["materialization"];
  if (m === "materialized_view" || m === "snapshot") return "table";
  return "view";
}

/** Pull a meta value from either `meta` or `config.meta`. */
function meta(node: J, key: string): string | null {
  const direct = asObj(node.meta)[key];
  const cfg = asObj(asObj(node.config).meta)[key];
  const v = asStr(direct) || asStr(cfg);
  return v || null;
}

function ownerKey(node: J): string | null {
  const o = asObj(node.meta).owner ?? asObj(asObj(node.config).meta).owner;
  if (typeof o === "string") return o || null;
  // dbt also allows { owner: { email | name } }
  const oo = asObj(o);
  return asStr(oo.email) || asStr(oo.name) || null;
}

function parseColumns(node: J): Map<string, ParsedColumn> {
  const out = new Map<string, ParsedColumn>();
  for (const [name, raw] of Object.entries(asObj(node.columns))) {
    const c = asObj(raw);
    out.set(name, {
      name,
      dataType: asStr(c.data_type) || null,
      description: asStr(c.description) || null,
      isPk: false,
      isFk: false,
      tests: [],
    });
  }
  return out;
}

/** A test node's target column name, across dbt manifest shapes. */
function testColumn(node: J): string {
  const tm = asObj(node.test_metadata);
  const kwargs = asObj(tm.kwargs);
  return asStr(node.column_name) || asStr(kwargs.column_name);
}

export function parseDbtArtifacts({
  manifest,
  catalog,
  runResults,
}: DbtArtifacts): ParsedImport {
  const m = asObj(manifest);
  const manifestNodes = asObj(m.nodes);
  const manifestSources = asObj(m.sources);

  // run_results: unique_id -> execution seconds
  const timings = new Map<string, number>();
  for (const r of asArr(asObj(runResults).results)) {
    const rr = asObj(r);
    const uid = asStr(rr.unique_id);
    if (uid) timings.set(uid, asNum(rr.execution_time));
  }

  // catalog: unique_id -> (column -> data type)
  const catTypes = new Map<string, Map<string, string>>();
  const cat = asObj(catalog);
  for (const group of [asObj(cat.nodes), asObj(cat.sources)]) {
    for (const [uid, raw] of Object.entries(group)) {
      const cols = new Map<string, string>();
      for (const [cname, craw] of Object.entries(asObj(asObj(raw).columns))) {
        const ty = asStr(asObj(craw).type);
        if (ty) cols.set(cname, ty);
      }
      catTypes.set(uid, cols);
    }
  }

  const models = new Map<string, ParsedModel>();
  const sources = new Map<string, ParsedSource>();
  const modelColumns = new Map<string, Map<string, ParsedColumn>>();
  const sourceColumns = new Map<string, Map<string, ParsedColumn>>();
  const relationships: ParsedRelationship[] = [];
  let testCount = 0;

  // Sources first (so relationship `to` refs can resolve by name later).
  for (const [uid, raw] of Object.entries(manifestSources)) {
    const node = asObj(raw);
    if (asStr(node.resource_type) !== "source") continue;
    const cols = parseColumns(node);
    sourceColumns.set(uid, cols);
    sources.set(uid, {
      dbtUniqueId: uid,
      name: asStr(node.name) || uid,
      system: asStr(node.source_name) || asStr(node.loader) || null,
      description: asStr(node.description) || null,
      grain: meta(node, "grain"),
      domainKey: meta(node, "domain"),
      columns: [],
      runSeconds: timings.get(uid) ?? null,
    });
  }

  // Models.
  for (const [uid, raw] of Object.entries(manifestNodes)) {
    const node = asObj(raw);
    if (asStr(node.resource_type) !== "model") continue;
    const cols = parseColumns(node);
    modelColumns.set(uid, cols);
    const dependsOn = asArr(asObj(node.depends_on).nodes)
      .map((d) => asStr(d))
      .filter(Boolean);
    models.set(uid, {
      dbtUniqueId: uid,
      name: asStr(node.name) || uid,
      description: asStr(node.description) || null,
      layer: inferLayer(node),
      materialization: inferMaterialization(node),
      grain: meta(node, "grain"),
      ownerKey: ownerKey(node),
      domainKey: meta(node, "domain"),
      columns: [],
      dependsOn,
      runSeconds: timings.get(uid) ?? null,
    });
  }

  // Tests: attach to columns; not_null+unique => PK; relationships => FK + edge.
  const colFor = (uid: string, col: string): ParsedColumn | undefined =>
    modelColumns.get(uid)?.get(col) ?? sourceColumns.get(uid)?.get(col);

  for (const [, raw] of Object.entries(manifestNodes)) {
    const node = asObj(raw);
    if (asStr(node.resource_type) !== "test") continue;
    const tm = asObj(node.test_metadata);
    const testName = asStr(tm.name);
    if (!testName) continue;
    testCount++;
    const attached =
      asStr(node.attached_node) ||
      asArr(asObj(node.depends_on).nodes)
        .map((d) => asStr(d))
        .find((d) => d.startsWith("model.") || d.startsWith("source.")) ||
      "";
    const colName = testColumn(node);
    if (!attached || !colName) continue;
    const col = colFor(attached, colName);
    if (!col) continue;
    if (!col.tests.includes(testName)) col.tests.push(testName);

    if (testName === "relationships") {
      col.isFk = true;
      const kwargs = asObj(tm.kwargs);
      // `to` is typically "ref('model_name')" or "source('s','t')"; `field` the column.
      const toRef = asStr(kwargs.to);
      const toField = asStr(kwargs.field);
      const toUid = resolveRef(toRef, models, sources);
      if (toUid && toField) {
        relationships.push({
          fromModel: attached,
          fromColumn: colName,
          toModel: toUid,
          toColumn: toField,
        });
      }
    }
  }

  // Finalize columns: merge catalog data types, derive PK, order.
  const finalize = (
    uid: string,
    colMap: Map<string, ParsedColumn>,
  ): ParsedColumn[] => {
    const types = catTypes.get(uid);
    return [...colMap.values()].map((c) => {
      const dataType = c.dataType ?? types?.get(c.name) ?? null;
      const isPk = c.tests.includes("not_null") && c.tests.includes("unique");
      return { ...c, dataType, isPk };
    });
  };

  let columnCount = 0;
  for (const [uid, model] of models) {
    model.columns = finalize(uid, modelColumns.get(uid) ?? new Map());
    columnCount += model.columns.length;
  }
  for (const [uid, source] of sources) {
    source.columns = finalize(uid, sourceColumns.get(uid) ?? new Map());
    columnCount += source.columns.length;
  }

  const modelList = [...models.values()];
  const depCount = modelList.reduce(
    (n, mdl) => n + mdl.dependsOn.filter((d) => models.has(d)).length,
    0,
  );

  return {
    models: modelList,
    sources: [...sources.values()],
    relationships,
    stats: {
      models: models.size,
      sources: sources.size,
      columns: columnCount,
      dependencies: depCount,
      relationships: relationships.length,
      tests: testCount,
      withTimings: timings.size,
    },
  };
}

/** Resolve a dbt `ref()`/`source()` expression to a unique_id, best-effort. */
function resolveRef(
  expr: string,
  models: Map<string, ParsedModel>,
  sources: Map<string, ParsedSource>,
): string | null {
  if (!expr) return null;
  const refName = /ref\(\s*['"]([^'"]+)['"]\s*\)/.exec(expr)?.[1];
  if (refName) {
    for (const [uid, mdl] of models) if (mdl.name === refName) return uid;
  }
  const src = /source\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/.exec(expr);
  if (src) {
    for (const [uid, s] of sources)
      if (s.system === src[1] && s.name === src[2]) return uid;
  }
  return null;
}
