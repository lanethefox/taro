-- The semantic layer: first-class metric definitions (MetricFlow-shaped), each
-- defined once on its canonical model. Distinct from the wiki (prose/principles).
-- Idempotent (conflict on name). `detect` is the regex the SQL analyzer uses to
-- catch a model recomputing the metric instead of referencing it.
insert into metrics (name, label, type, model_id, expression, detect, domain_id, visibility)
select v.name, v.label, v.type::metric_type, m.id, v.expression, v.detect, d.id, 'viewer'
from (values
 ('Revenue','Revenue','simple','fct_subscription_revenue','sum(amount)','sum\s*\(\s*[\w.]*\b(amount|revenue|gross)\b','finance'),
 ('MRR','Monthly recurring revenue','simple','fct_subscription_revenue','sum(mrr)','sum\s*\(\s*[\w.]*\bmrr\b','finance'),
 ('ARR','Annual recurring revenue','derived','fct_subscription_revenue','mrr * 12',null,'finance'),
 ('Active students','Active students','simple','fct_engagement_events','count(distinct student_id)','count\s*\(\s*distinct\s+[\w.]*\b(student_id|user_id)\b','platform'),
 ('Active accounts','Active accounts','simple','fct_engagement_events','count(distinct account_id)','count\s*\(\s*distinct\s+[\w.]*\baccount_id\b','platform'),
 ('Engagement events','Engagement events','simple','fct_engagement_events','count(*)',null,'platform'),
 ('Feedback points','Feedback points awarded','simple','fct_feedback_points','sum(points)','sum\s*\(\s*[\w.]*\bpoints?\b','platform'),
 ('Messages sent','Messages sent','simple','fct_messages','count(*)',null,'platform'),
 ('Tutor sessions','Tutor sessions','simple','fct_tutor_sessions','count(*)',null,'sales'),
 ('Tutoring GMV','Tutoring GMV','simple','fct_tutor_sessions','sum(booking_amount)',null,'sales')
) as v(name,label,type,model_name,expression,detect,domain_slug)
left join models m on m.name=v.model_name
left join domains d on d.slug=v.domain_slug
on conflict (name) do nothing;

insert into metrics (name, label, type, model_id, numerator_id, denominator_id, domain_id, visibility)
select 'ARPU','Average revenue per account','ratio',
 (select id from models where name='fct_subscription_revenue'),
 (select id from metrics where name='Revenue'),
 (select id from metrics where name='Active accounts'),
 (select id from domains where slug='finance'),'viewer'
where not exists (select 1 from metrics where name='ARPU');
