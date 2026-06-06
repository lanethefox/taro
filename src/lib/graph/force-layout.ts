/**
 * Pure Fruchterman-Reingold force-directed layout for the whole-knowledge-graph
 * viewer. No React Flow / DB imports so it can be smoke-tested with
 * `node --experimental-strip-types`. Deterministic (circle seed) so server and
 * any re-run agree.
 */

export type ForceNode = { id: string };
export type ForceEdge = { source: string; target: string };
export type Positioned = { id: string; x: number; y: number };
export type ForceLayout = { positions: Positioned[]; width: number; height: number };

const SCALE = 1.5; // spacing multiplier so labelled nodes don't collide
const MARGIN = 48;

/** Lay out nodes by simulating repulsion (all pairs) + attraction (edges). */
export function forceLayout(nodes: ForceNode[], edges: ForceEdge[]): ForceLayout {
  const N = nodes.length;
  if (N === 0) return { positions: [], width: 0, height: 0 };

  const idx = new Map(nodes.map((n, i) => [n.id, i] as const));
  const W = Math.max(600, Math.sqrt(N) * 180);
  const k = W / Math.sqrt(N); // ideal edge length

  const px = new Float64Array(N);
  const py = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    // jitter off the circle so coincident points repel cleanly
    px[i] = Math.cos(a) * (W / 2) + (i % 7) * 4;
    py[i] = Math.sin(a) * (W / 2) + (i % 5) * 4;
  }

  const E: Array<[number, number]> = [];
  for (const e of edges) {
    const a = idx.get(e.source);
    const b = idx.get(e.target);
    if (a !== undefined && b !== undefined && a !== b) E.push([a, b]);
  }

  const iters = Math.min(400, 140 + N);
  let temp = W * 0.1;
  const cool = temp / (iters + 1);

  const dx = new Float64Array(N);
  const dy = new Float64Array(N);

  for (let it = 0; it < iters; it++) {
    dx.fill(0);
    dy.fill(0);

    // Repulsion between every pair.
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let vx = px[i] - px[j];
        let vy = py[i] - py[j];
        let d2 = vx * vx + vy * vy;
        if (d2 < 0.01) {
          vx = (i - j) || 1;
          vy = 1;
          d2 = vx * vx + vy * vy;
        }
        const d = Math.sqrt(d2);
        const f = (k * k) / d;
        const ux = vx / d;
        const uy = vy / d;
        dx[i] += ux * f;
        dy[i] += uy * f;
        dx[j] -= ux * f;
        dy[j] -= uy * f;
      }
    }

    // Attraction along edges.
    for (const [a, b] of E) {
      const vx = px[a] - px[b];
      const vy = py[a] - py[b];
      const d = Math.sqrt(vx * vx + vy * vy) || 0.01;
      const f = (d * d) / k;
      const ux = vx / d;
      const uy = vy / d;
      dx[a] -= ux * f;
      dy[a] -= uy * f;
      dx[b] += ux * f;
      dy[b] += uy * f;
    }

    // Gentle gravity toward origin keeps disconnected nodes from drifting away.
    for (let i = 0; i < N; i++) {
      dx[i] -= px[i] * 0.012;
      dy[i] -= py[i] * 0.012;
      const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 0.01;
      const lim = Math.min(d, temp);
      px[i] += (dx[i] / d) * lim;
      py[i] += (dy[i] / d) * lim;
    }
    temp -= cool;
  }

  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;
  for (let i = 0; i < N; i++) {
    minx = Math.min(minx, px[i]);
    miny = Math.min(miny, py[i]);
    maxx = Math.max(maxx, px[i]);
    maxy = Math.max(maxy, py[i]);
  }

  const positions = nodes.map((n, i) => ({
    id: n.id,
    x: (px[i] - minx) * SCALE + MARGIN,
    y: (py[i] - miny) * SCALE + MARGIN,
  }));

  return {
    positions,
    width: (maxx - minx) * SCALE + MARGIN * 2,
    height: (maxy - miny) * SCALE + MARGIN * 2,
  };
}
