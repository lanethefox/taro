-- ============================================================================
-- taro — Row-Level Security policies (SPEC §6, BUILD-PLAN §3)
--
-- Model:
--   • Default deny. RLS is enabled on every table; access is granted only by the
--     policies below.
--   • owner   — full CRUD on everything (role = 'owner' in profiles).
--   • viewer  — any authenticated user; SELECT where visibility <> 'private'.
--   • public  — anonymous; SELECT only where visibility = 'public'.
--
-- Role is read from public.profiles, keyed to auth.uid(). Helper functions are
-- SECURITY DEFINER so they can read profiles without tripping RLS recursion.
--
-- Apply after the Drizzle migration:
--   psql "$DATABASE_URL" -f supabase/policies.sql
-- (or paste into the Supabase SQL editor).
-- ============================================================================

-- profiles.user_id mirrors auth.users.id — wire up the FK the ORM can't express.
alter table public.profiles
  drop constraint if exists profiles_user_id_fkey;
alter table public.profiles
  add constraint profiles_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

-- ----------------------------------------------------------------------------
-- Helper functions
-- ----------------------------------------------------------------------------

create or replace function public.taro_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.taro_can_read_visibility(v public.visibility)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    v = 'public'
    or (auth.uid() is not null and v = 'viewer')
    or public.taro_is_owner();
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS everywhere (default deny)
-- ----------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.pages               enable row level security;
alter table public.posts               enable row level security;
alter table public.decision_meta       enable row level security;
alter table public.tags                enable row level security;
alter table public.taggables           enable row level security;
alter table public.links               enable row level security;
alter table public.sources             enable row level security;
alter table public.models              enable row level security;
alter table public.columns             enable row level security;
alter table public.model_dependencies  enable row level security;
alter table public.relationships       enable row level security;
alter table public.diagrams            enable row level security;
alter table public.diagram_nodes       enable row level security;
alter table public.diagram_edges       enable row level security;
alter table public.attachments         enable row level security;
alter table public.revisions           enable row level security;
alter table public.case_studies        enable row level security;
alter table public.case_study_tasks    enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
--   owner: all. each user can read their own row. (writes go through the
--   service-role client during sign-in provisioning.)
-- ----------------------------------------------------------------------------

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
  for all to authenticated
  using (public.taro_is_owner())
  with check (public.taro_is_owner());

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Visibility-bearing tables: owner writes; SELECT gated by visibility.
-- ----------------------------------------------------------------------------

-- pages
drop policy if exists pages_owner_all on public.pages;
create policy pages_owner_all on public.pages
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists pages_read on public.pages;
create policy pages_read on public.pages
  for select using (public.taro_can_read_visibility(visibility));

-- posts (the per-post public sharing surface)
drop policy if exists posts_owner_all on public.posts;
create policy posts_owner_all on public.posts
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts
  for select using (public.taro_can_read_visibility(visibility));

-- sources
drop policy if exists sources_owner_all on public.sources;
create policy sources_owner_all on public.sources
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists sources_read on public.sources;
create policy sources_read on public.sources
  for select using (public.taro_can_read_visibility(visibility));

-- models
drop policy if exists models_owner_all on public.models;
create policy models_owner_all on public.models
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists models_read on public.models;
create policy models_read on public.models
  for select using (public.taro_can_read_visibility(visibility));

-- diagrams
drop policy if exists diagrams_owner_all on public.diagrams;
create policy diagrams_owner_all on public.diagrams
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists diagrams_read on public.diagrams;
create policy diagrams_read on public.diagrams
  for select using (public.taro_can_read_visibility(visibility));

-- ----------------------------------------------------------------------------
-- Child tables: owner writes; SELECT inherits the parent's visibility.
-- ----------------------------------------------------------------------------

-- decision_meta → posts
drop policy if exists decision_meta_owner_all on public.decision_meta;
create policy decision_meta_owner_all on public.decision_meta
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists decision_meta_read on public.decision_meta;
create policy decision_meta_read on public.decision_meta
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and public.taro_can_read_visibility(p.visibility)
    )
  );

-- columns → models / sources
drop policy if exists columns_owner_all on public.columns;
create policy columns_owner_all on public.columns
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists columns_read on public.columns;
create policy columns_read on public.columns
  for select using (
    (parent_type = 'model' and exists (
      select 1 from public.models m
      where m.id = parent_id and public.taro_can_read_visibility(m.visibility)
    ))
    or (parent_type = 'source' and exists (
      select 1 from public.sources s
      where s.id = parent_id and public.taro_can_read_visibility(s.visibility)
    ))
  );

-- relationships → models (read if either endpoint model is readable)
drop policy if exists relationships_owner_all on public.relationships;
create policy relationships_owner_all on public.relationships
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists relationships_read on public.relationships;
create policy relationships_read on public.relationships
  for select using (
    exists (
      select 1 from public.models m
      where m.id in (from_model_id, to_model_id)
        and public.taro_can_read_visibility(m.visibility)
    )
  );

-- model_dependencies → models
drop policy if exists model_dependencies_owner_all on public.model_dependencies;
create policy model_dependencies_owner_all on public.model_dependencies
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists model_dependencies_read on public.model_dependencies;
create policy model_dependencies_read on public.model_dependencies
  for select using (
    exists (
      select 1 from public.models m
      where m.id in (upstream_id, downstream_id)
        and public.taro_can_read_visibility(m.visibility)
    )
  );

-- diagram_nodes → diagrams
drop policy if exists diagram_nodes_owner_all on public.diagram_nodes;
create policy diagram_nodes_owner_all on public.diagram_nodes
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists diagram_nodes_read on public.diagram_nodes;
create policy diagram_nodes_read on public.diagram_nodes
  for select using (
    exists (
      select 1 from public.diagrams d
      where d.id = diagram_id and public.taro_can_read_visibility(d.visibility)
    )
  );

-- diagram_edges → diagrams
drop policy if exists diagram_edges_owner_all on public.diagram_edges;
create policy diagram_edges_owner_all on public.diagram_edges
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists diagram_edges_read on public.diagram_edges;
create policy diagram_edges_read on public.diagram_edges
  for select using (
    exists (
      select 1 from public.diagrams d
      where d.id = diagram_id and public.taro_can_read_visibility(d.visibility)
    )
  );

-- ----------------------------------------------------------------------------
-- Graph & taxonomy tables: owner writes; authenticated read.
-- (Edge/tag rows are bare IDs — no private content. Anonymous public rendering
-- of a shared post is done server-side with the service role.)
-- ----------------------------------------------------------------------------

-- tags
drop policy if exists tags_owner_all on public.tags;
create policy tags_owner_all on public.tags
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists tags_read on public.tags;
create policy tags_read on public.tags
  for select to authenticated using (true);

-- taggables
drop policy if exists taggables_owner_all on public.taggables;
create policy taggables_owner_all on public.taggables
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists taggables_read on public.taggables;
create policy taggables_read on public.taggables
  for select to authenticated using (true);

-- links
drop policy if exists links_owner_all on public.links;
create policy links_owner_all on public.links
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists links_read on public.links;
create policy links_read on public.links
  for select to authenticated using (true);

-- attachments
drop policy if exists attachments_owner_all on public.attachments;
create policy attachments_owner_all on public.attachments
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments
  for select to authenticated using (true);

-- revisions (append-only history)
drop policy if exists revisions_owner_all on public.revisions;
create policy revisions_owner_all on public.revisions
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists revisions_read on public.revisions;
create policy revisions_read on public.revisions
  for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- Case studies: owner writes; SELECT by visibility. Tasks inherit the study.
-- ----------------------------------------------------------------------------

drop policy if exists case_studies_owner_all on public.case_studies;
create policy case_studies_owner_all on public.case_studies
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists case_studies_read on public.case_studies;
create policy case_studies_read on public.case_studies
  for select using (public.taro_can_read_visibility(visibility));

drop policy if exists case_study_tasks_owner_all on public.case_study_tasks;
create policy case_study_tasks_owner_all on public.case_study_tasks
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists case_study_tasks_read on public.case_study_tasks;
create policy case_study_tasks_read on public.case_study_tasks
  for select using (
    exists (
      select 1 from public.case_studies c
      where c.id = case_study_id
        and public.taro_can_read_visibility(c.visibility)
    )
  );
