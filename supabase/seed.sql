-- ============================================================================
-- taro — seed data: the strategy-library content pillars (SPEC §4.5).
--
-- Six Concept pages that form the reference backbone and are the canonical link
-- targets from the catalog. M1 fleshes out the prose; this seed makes taro
-- useful on day one. Run with the service role (RLS-bypassing), e.g.:
--   psql "$DATABASE_URL" -f supabase/seed.sql
-- Idempotent: re-running updates the stub bodies by slug.
-- ============================================================================

insert into public.pages (title, slug, kind, visibility, content)
values
  (
    'Modeling theory',
    'modeling-theory',
    'concept',
    'viewer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Dimensional (Kimball), one-big-table, activity schema, data vault, semantic layers, and normalization trade-offs."}]}]}'
  ),
  (
    'Materialization strategies',
    'materialization-strategies',
    'concept',
    'viewer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"View vs. table vs. incremental vs. ephemeral — when and why, with cost/performance trade-offs."}]}]}'
  ),
  (
    'Observation strategies',
    'observation-strategies',
    'concept',
    'viewer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Freshness, volume, distribution, anomaly detection, contracts, and alerting."}]}]}'
  ),
  (
    'Orchestration strategies',
    'orchestration-strategies',
    'concept',
    'viewer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Scheduling, dependency graphs, backfills, CI/CD for transformations, and environments."}]}]}'
  ),
  (
    'Testing & data quality',
    'testing-and-data-quality',
    'concept',
    'viewer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test taxonomy, coverage strategy, and contracts."}]}]}'
  ),
  (
    'ML / AI integration',
    'ml-ai-integration',
    'concept',
    'viewer',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Feature/marts hand-off to ML, embeddings & vector stores in the warehouse, LLM-assisted documentation & semantic search."}]}]}'
  )
on conflict (slug) do update
  set title = excluded.title,
      kind = excluded.kind,
      content = excluded.content,
      updated_at = now();

insert into public.tags (name, slug, color)
values
  ('incremental', 'incremental', '#2563eb'),
  ('dimensional modeling', 'dimensional-modeling', '#7c3aed'),
  ('one-big-table', 'one-big-table', '#059669'),
  ('observation', 'observation', '#d97706'),
  ('testing', 'testing', '#dc2626')
on conflict (slug) do nothing;
