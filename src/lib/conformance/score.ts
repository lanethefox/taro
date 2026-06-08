/**
 * Scoring + rollups over check results. A node's score is the weighted pass rate
 * across applicable checks; a failing soft (warn) check earns half credit. Domain
 * and platform scores are the mean of node scores. Pure.
 */
import { CHECKS, type CheckResult } from "./checks";

const weightByKey = new Map(CHECKS.map((c) => [c.key, c.weight]));

export type NodeScore = {
  score: number;
  passed: number;
  failed: number;
  warned: number;
  applicable: number;
};

export function scoreNode(results: CheckResult[]): NodeScore {
  let totalW = 0;
  let passW = 0;
  let passed = 0;
  let failed = 0;
  let warned = 0;
  let applicable = 0;
  for (const r of results) {
    if (r.status === "na") continue;
    const w = weightByKey.get(r.key) ?? 1;
    totalW += w;
    applicable++;
    if (r.status === "pass") {
      passW += w;
      passed++;
    } else if (r.status === "warn") {
      passW += w * 0.5;
      warned++;
    } else {
      failed++;
    }
  }
  const score = totalW === 0 ? 100 : Math.round((passW / totalW) * 100);
  return { score, passed, failed, warned, applicable };
}

/** Mean of node scores, or null when there are no nodes. */
export function rollupScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
