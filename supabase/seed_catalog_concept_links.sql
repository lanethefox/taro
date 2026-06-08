-- Semantics governance: resolve the one genuine duplicate concept + wire ~80% of
-- the catalog to concepts (leaving the 3 legacy models + raw sources unwired as
-- examples to fix). Idempotent. Run after the wiki + catalog seeds.

-- Canonical semantic-layer concept = "Semantics & the semantic layer"; demote the
-- AE "The semantic layer" page from a concept to a regular wiki page.
update pages set kind = 'wiki' where slug = 'the-semantic-layer' and kind = 'concept';

-- Wire every non-legacy model to a relevant concept (by name; falls back to Grain).
insert into links (source_type, source_id, target_type, target_id, context)
select 'model'::node_type, m.id, 'page'::node_type, p.id, 'concept'
from models m
join pages p on p.slug = case
  when m.name ~* 'revenue|mrr|arr|subscription|billing' then 'mrr-and-arr'
  when m.name ~* 'churn|retention' then 'churn-and-retention'
  when m.name ~* 'ticket|support|csat|nps|satisfaction|zendesk' then 'support-analytics'
  when m.name ~* 'campaign|attribution|channel|acquisition|marketing|utm' then 'attribution-models'
  when m.name ~* 'pipeline|opportunit|lead|deal|sales|quota|booking' then 'the-pipeline-and-stages'
  when m.name ~* 'bridge' then 'relationships'
  when m.name ~* 'dim_|roster|school|district|account|user' then 'entities-and-identity'
  when m.name ~* 'fct_|fact|agg|wbr|rpt' then 'aggregation'
  when m.name ~* 'session|event|activity|usage|engagement' then 'identity-and-sessions'
  else 'grain'
end
where m.name not in ('RevenueDashboardFinal','mart_kpis_v2','tmp_user_metrics')
on conflict (source_type, source_id, target_type, target_id) do nothing;

-- Wire two representative sources; the rest stay unwired as examples.
insert into links (source_type, source_id, target_type, target_id, context)
select 'source'::node_type, s.id, 'page'::node_type, p.id, 'concept'
from sources s
join pages p on p.slug = 'grain'
where s.name in ('Application DB', 'Dojo Tutor marketplace')
on conflict (source_type, source_id, target_type, target_id) do nothing;
