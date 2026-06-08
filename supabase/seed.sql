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
  )
-- The former strategy stubs (materialization, observation, orchestration, testing,
-- ML/AI) were removed when the "Analytics engineering practice" node was retired.
-- That ground is now covered with full content in supabase/seed_transformation_orchestration.sql
-- and supabase/seed_analytics_engineering.sql.
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
