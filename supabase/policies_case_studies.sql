-- ============================================================================
-- RLS for the case-studies tables (run after drizzle/0001_case_studies.sql).
-- Same model as the rest of the app: owner full CRUD; viewers read non-private;
-- public reads only visibility = 'public'. Tasks inherit their case study's
-- visibility. Relies on the helper functions from supabase/policies.sql.
-- ============================================================================

alter table public.case_studies      enable row level security;
alter table public.case_study_tasks  enable row level security;

-- case_studies
drop policy if exists case_studies_owner_all on public.case_studies;
create policy case_studies_owner_all on public.case_studies
  for all to authenticated
  using (public.taro_is_owner()) with check (public.taro_is_owner());
drop policy if exists case_studies_read on public.case_studies;
create policy case_studies_read on public.case_studies
  for select using (public.taro_can_read_visibility(visibility));

-- case_study_tasks → inherit the parent case study's visibility
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
