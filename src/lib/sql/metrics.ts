/**
 * Canonical metrics — the business definitions that should each live in exactly
 * one place. The analyzer uses these to spot a legacy model *recomputing* a
 * metric that already has a home, which is the duplication taro exists to kill.
 * (Later: derive this from the semantic layer instead of a constant.)
 */
export type CanonicalMetric = {
  key: string;
  label: string;
  /** The model that should own this metric — what others should `ref`. */
  owner: string;
  /** Expressions that indicate the metric is being computed. */
  patterns: RegExp[];
};

export const CANONICAL_METRICS: CanonicalMetric[] = [
  {
    key: "revenue",
    label: "Revenue",
    owner: "fct_revenue",
    patterns: [
      /sum\s*\(\s*[\w.]*\b(amount|revenue|price|gross)\b/i,
      /sum\s*\(\s*[\w.]*amount\s*\*\s*[\w.]*(qty|quantity)/i,
    ],
  },
  {
    key: "active_users",
    label: "Active users",
    owner: "fct_user_activity",
    patterns: [/count\s*\(\s*distinct\s+[\w.]*user_id/i, /count\s*\(\s*distinct\s+[\w.]*account_id/i],
  },
  {
    key: "orders",
    label: "Order count",
    owner: "fct_orders",
    patterns: [/count\s*\(\s*distinct\s+[\w.]*order_id/i],
  },
  {
    key: "mrr",
    label: "MRR",
    owner: "fct_subscriptions",
    patterns: [/sum\s*\(\s*[\w.]*\bmrr\b/i, /monthly_recurring_revenue/i],
  },
];
