-- Disparate "legacy" models: bloated, non-conforming dbt SQL with duplicated
-- metrics and nonstandard naming, for the decomposition advisor to catch.
-- Idempotent (insert only if the name is absent). SQL bodies are dollar-quoted.

-- 1) God model: many joins, recomputes revenue/orders/active_users/mrr, SELECT *,
--    nested subqueries, hardcoded refs, nonstandard name. Should be FLAGGED.
insert into models (name, layer, materialization, grain, domain_id, visibility, description, sql)
select 'RevenueDashboardFinal', 'marts', 'table', null,
  (select id from domains where slug='marketing'), 'viewer',
  'Ad-hoc revenue dashboard, accreted over two years. Nobody owns it.',
  $sql$
with orders as (
  select * from raw.app.orders
),
users as (
  select * from (select * from (select * from raw.app.users) a) b
),
pay as (
  select * from raw.billing.payments
)
select
  o.user_id,
  u.region,
  sum(o.amount) as revenue,
  sum(o.amount * o.qty) as gross_revenue,
  count(distinct o.order_id) as orders,
  count(distinct o.user_id) as active_users,
  sum(s.mrr) as mrr
from orders o
join users u on u.id = o.user_id
join pay p on p.order_id = o.order_id
join raw.app.sessions se on se.user_id = o.user_id
join raw.app.devices d on d.user_id = o.user_id
join raw.marketing.campaigns c on c.user_id = o.user_id
join raw.billing.subscriptions s on s.user_id = o.user_id
group by 1, 2
$sql$
where not exists (select 1 from models where name = 'RevenueDashboardFinal');

-- 2) KPI mart: reads a source directly, recomputes revenue/orders, SELECT *.
--    Should be DECOMPOSABLE.
insert into models (name, layer, materialization, grain, domain_id, visibility, description, sql)
select 'mart_kpis_v2', 'marts', 'table', null,
  (select id from domains where slug='finance'), 'viewer',
  'Second attempt at a KPI mart; reads raw directly.',
  $sql$
select
  date_trunc('month', created_at) as month,
  *,
  sum(amount) as revenue,
  count(distinct order_id) as orders
from {{ source("raw", "orders") }}
group by 1
$sql$
where not exists (select 1 from models where name = 'mart_kpis_v2');

-- 3) Temp intermediate: recomputes active_users, hardcoded ref, nonstandard name.
--    Should be DECOMPOSABLE.
insert into models (name, layer, materialization, grain, domain_id, visibility, description, sql)
select 'tmp_user_metrics', 'intermediate', 'view', null,
  (select id from domains where slug='ops'), 'viewer',
  'Temporary user metrics someone never cleaned up.',
  $sql$
select
  user_id,
  count(distinct user_id) as active_users,
  count(*) as events
from analytics.prod.events
where event_date > '2024-01-01'
group by 1
$sql$
where not exists (select 1 from models where name = 'tmp_user_metrics');
