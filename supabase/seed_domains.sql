-- Taro control center: the arms of the business (domains = cost centers).
-- Each links to its wiki section via concept_page_id. Idempotent (slug conflict).
-- Budgets are illustrative starting points the AE team can edit.
insert into domains (name, slug, description, concept_page_id, monthly_budget, visibility, position)
select v.name, v.slug, v.description, p.id, v.budget::numeric, 'viewer', v.position
from (values
  ('Marketing', 'marketing', 'Acquisition, campaigns, attribution, and lifecycle marketing.', 'marketing-analytics', 8000, 1),
  ('Sales', 'sales', 'Pipeline, forecasting, quota, and revenue operations.', 'sales-analytics', 6000, 2),
  ('Customer experience', 'cx', 'Support, success, retention, and satisfaction.', 'cx-analytics', 5000, 3),
  ('Finance', 'finance', 'Revenue, billing, margin, and the finance source of truth.', 'finance-analytics', 7000, 4),
  ('Operations', 'ops', 'Supply, fulfillment, capacity, and operational efficiency.', 'ops-analytics', 5000, 5),
  ('Platform', 'platform', 'The conformed core and shared infrastructure every arm depends on.', 'analytics-engineering', 12000, 6)
) as v(name, slug, description, concept_slug, budget, position)
left join pages p on p.slug = v.concept_slug
on conflict (slug) do nothing;
