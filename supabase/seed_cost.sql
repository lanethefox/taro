-- Taro FinOps seed: domain assignment + configurable cost functions + usage.
-- Idempotent: domain assignment only fills nulls; cost configs are replaced from
-- scratch (this is the initial seed); usage upserts by (node,period).
-- Cost figures are illustrative starting points the AE team edits in /taro/cost/config.

/* ---- Assign sources to arms (cost centers) ---- */
update sources s set domain_id = d.id
from (values
  ('Application DB','platform'),
  ('Product event stream','platform'),
  ('Dojo Tutor marketplace','sales'),
  ('Marketing & attribution','marketing'),
  ('RevenueCat','finance'),
  ('SSO / rostering','ops'),
  ('Support (Zendesk)','cx')
) as v(sname, dslug)
join domains d on d.slug = v.dslug
where s.name = v.sname and s.domain_id is null;

/* ---- Assign models to arms by name heuristics (fill nulls only) ---- */
update models set domain_id = (select id from domains where slug='finance')
  where domain_id is null and (name ilike '%revenue%' or name ilike '%subscription%' or name ilike '%billing%' or name ilike '%mrr%' or name ilike '%arr%' or name ilike '%payment%' or name ilike '%invoice%' or name ilike '%ltv%');
update models set domain_id = (select id from domains where slug='marketing')
  where domain_id is null and (name ilike '%marketing%' or name ilike '%attribution%' or name ilike '%campaign%' or name ilike '%acquisition%' or name ilike '%channel%');
update models set domain_id = (select id from domains where slug='cx')
  where domain_id is null and (name ilike '%support%' or name ilike '%ticket%' or name ilike '%csat%' or name ilike '%zendesk%' or name ilike '%nps%' or name ilike '%satisfaction%');
update models set domain_id = (select id from domains where slug='sales')
  where domain_id is null and (name ilike '%tutor%' or name ilike '%marketplace%' or name ilike '%booking%' or name ilike '%sales%' or name ilike '%gmv%');
update models set domain_id = (select id from domains where slug='ops')
  where domain_id is null and (name ilike '%roster%' or name ilike '%school%' or name ilike '%district%' or name ilike '%sso%' or name ilike '%provision%' or name ilike '%capacity%');
update models set domain_id = (select id from domains where slug='platform')
  where domain_id is null;

/* ---- A Claude API source for token/LLM cost (serving), under Platform ---- */
insert into sources (name, system, description, grain, domain_id, visibility)
select 'Claude API', 'Anthropic', 'LLM serving — text-to-SQL and agent context over the semantic layer.', 'one row per request', d.id, 'viewer'
from domains d where d.slug='platform'
on conflict do nothing;

/* ---- Cost functions (replace from scratch on seed) ---- */
delete from cost_configs where scope in ('global','source');

-- Global compute rate for models: per run-second.
insert into cost_configs (scope, node_id, unit, method, fixed_cost, per_unit_rate, tiers, currency)
values ('global', null, 'run-seconds', 'per_unit', 0, 0.0006, null, 'USD');

-- Per-source cost functions (Fivetran MAR, Segment MTU, tokens, ...).
insert into cost_configs (scope, node_id, unit, method, fixed_cost, per_unit_rate, tiers, currency)
select 'source', s.id, v.unit, v.method::cost_method, v.fixed::numeric, v.rate::numeric, v.tiers::jsonb, 'USD'
from (values
  ('Application DB',         'MAR',         'tiered',   0,    null,     '[{"upTo":1000000,"rate":0.00015},{"upTo":null,"rate":0.00008}]'),
  ('Product event stream',  'MTU',         'tiered',   120,  null,     '[{"upTo":10000,"rate":0},{"upTo":null,"rate":0.01}]'),
  ('Marketing & attribution','MTU',        'per_unit', 1500, 0.02,     null),
  ('RevenueCat',            'transactions','per_unit', 0,    0.05,     null),
  ('SSO / rostering',       'flat-fee',    'flat',     1000, null,     null),
  ('Support (Zendesk)',     'agents',      'per_unit', 0,    115,      null),
  ('Dojo Tutor marketplace','API-calls',   'per_unit', 0,    0.000002, null),
  ('Claude API',            'tokens',      'per_unit', 0,    0.000003, null)
) as v(sname, unit, method, fixed, rate, tiers)
join sources s on s.name = v.sname;

/* ---- Usage for the current period ---- */
-- Source drivers.
insert into cost_usage (node_type, node_id, period, units, source)
select 'source', s.id, date '2026-06-01', v.units::numeric, 'manual'
from (values
  ('Application DB', 3500000),
  ('Product event stream', 250000),
  ('Marketing & attribution', 180000),
  ('RevenueCat', 40000),
  ('SSO / rostering', 1),
  ('Support (Zendesk)', 35),
  ('Dojo Tutor marketplace', 90000000),
  ('Claude API', 120000000)
) as v(sname, units)
join sources s on s.name = v.sname
on conflict (node_type, node_id, period) do update set units = excluded.units, source = 'manual', updated_at = now();

-- Model build seconds (proxy until run_results are imported), by layer.
insert into cost_usage (node_type, node_id, period, units, source)
select 'model', id, date '2026-06-01',
  (case layer when 'marts' then 600 when 'intermediate' then 200 else 60 end)::numeric, 'run_results'
from models
on conflict (node_type, node_id, period) do nothing;
