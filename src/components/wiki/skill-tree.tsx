"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";

import type { Layout, NodeState, PlacedNode, SkillHud } from "@/lib/skill-tree";
import { NODE } from "@/lib/skill-tree";

const ACCENT: Record<NodeState, string> = {
  mastered: "#e6c25f",
  seedling: "#8fae7f",
  stub: "#6b6253",
};
const GLOW: Record<NodeState, string> = {
  mastered: "0 0 16px rgba(230,194,95,.5)",
  seedling: "0 0 14px rgba(143,174,127,.4)",
  stub: "none",
};
const STATE_LABEL: Record<NodeState, string> = {
  mastered: "Mastered",
  seedling: "Growing",
  stub: "Unwritten",
};

function NodeGlyph({ state, root }: { state: NodeState; root: boolean }) {
  const c = ACCENT[state];
  if (root) {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M12 3l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4Z" fill={c} stroke="#1b180f" strokeWidth="1.3" />
        <path d="M9 12l2 2 4-4" stroke="#1b180f" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "mastered") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 3l2.4 5 5.6.8-4 3.9 1 5.5L12 16.5 6.9 18.1l1-5.5-4-3.9 5.6-.8L12 3Z" fill={c} stroke="#1b180f" strokeWidth="1.1" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "seedling") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 21v-7" stroke={c} strokeWidth="2" strokeLinecap="round" />
        <path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5Z" fill={c} opacity=".85" />
        <path d="M12 16c0-2.5-2-4.5-6-4.5 0 2.5 2 4.5 6 4.5Z" fill={c} opacity=".55" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" fill="none" stroke={c} strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold leading-none text-foreground">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export function SkillTree({
  layout,
  hud,
  ownerInitial,
  canCreate,
}: {
  layout: Layout;
  hud: SkillHud;
  ownerInitial: string;
  canCreate: boolean;
}) {
  const root = layout.nodes.find((n) => n.depth === 0) ?? layout.nodes[0];
  const [selectedId, setSelectedId] = useState<string>(root?.id ?? "");
  const byId = new Map(layout.nodes.map((n) => [n.id, n] as const));
  const selected: PlacedNode | undefined = byId.get(selectedId) ?? root;

  return (
    <div
      className="dark min-h-[calc(100svh-3.5rem)] text-foreground"
      style={{
        background:
          "radial-gradient(110% 80% at 50% -10%, #2c271e 0%, #211d17 60%)",
      }}
    >
      {/* HUD */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border bg-card/60 px-5 py-4 backdrop-blur">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2"
          style={{
            borderColor: "#e6c25f",
            background: "radial-gradient(circle at 50% 35%,#a9c098,#5e7a52)",
            boxShadow: "0 0 14px rgba(230,194,95,.4)",
          }}
        >
          <span className="text-lg font-bold text-[#1b180f]">{ownerInitial}</span>
        </div>

        <div className="min-w-[180px] flex-1">
          <div className="text-sm font-bold">Analytics Engineer</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Level {hud.level} · {hud.totalXp.toLocaleString()} XP total
          </div>
          <div className="mt-2 max-w-sm">
            <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>XP</span>
              <span>
                {hud.xpInto} / {hud.xpForLevel}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-border bg-[#1b180f]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, (hud.xpInto / hud.xpForLevel) * 100)}%`,
                  background: "linear-gradient(90deg,#8fae7f,#b6d0a3)",
                  boxShadow: "0 0 12px rgba(143,174,127,.7)",
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: "#e6c25f", background: "rgba(230,194,95,.08)" }}
          title="Unfinished case-study tasks — quests left to grow"
        >
          <Sparkles className="size-4" style={{ color: "#e6c25f" }} />
          <span className="font-mono text-xs font-bold" style={{ color: "#e6c25f" }}>
            {hud.skillPoints} SP
          </span>
        </div>

        <div className="flex items-center gap-5 rounded-lg border border-border bg-background/40 px-4 py-2">
          <Stat label="Mastered" value={`${hud.pagesWritten}/${hud.pagesTotal}`} />
          <Stat label="Coverage" value={`${hud.coverage}%`} />
          <Stat label="Growing" value={`${hud.seedlings}`} />
        </div>

        {canCreate ? (
          <Link
            href="/wiki/new"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Plus className="size-4" />
            New page
          </Link>
        ) : null}
      </div>

      {/* intro + legend */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
        <div>
          <h1 className="text-xl font-bold">Skill Tree — Analytics Engineering</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Your knowledge as a talent tree. Nodes you’ve written are{" "}
            <span style={{ color: "#e6c25f" }}>mastered</span>; thinner pages are{" "}
            <span style={{ color: "#8fae7f" }}>growing</span>. Pick a node to inspect
            it, then open the page to level it up.
          </p>
        </div>
        <div className="flex gap-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {(["mastered", "seedling", "stub"] as NodeState[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: ACCENT[s], boxShadow: GLOW[s] }}
              />
              {STATE_LABEL[s]}
            </span>
          ))}
        </div>
      </div>

      {/* tree + detail */}
      <div className="flex flex-col gap-4 p-5 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-border bg-background/30 p-2">
          <div className="relative" style={{ width: layout.width, height: layout.height }}>
            <svg
              className="absolute inset-0"
              width={layout.width}
              height={layout.height}
              style={{ pointerEvents: "none" }}
            >
              <defs>
                <filter id="wireglow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {layout.edges.map((e, i) => {
                const ymid = (e.y1 + e.y2) / 2;
                return (
                  <path
                    key={i}
                    d={`M ${e.x1} ${e.y1} C ${e.x1} ${ymid} ${e.x2} ${ymid} ${e.x2} ${e.y2}`}
                    fill="none"
                    stroke={ACCENT[e.state]}
                    strokeWidth={e.state === "stub" ? 2 : 3}
                    strokeDasharray={e.state === "stub" ? "4 6" : undefined}
                    opacity={e.state === "stub" ? 0.5 : 0.8}
                    filter={e.state === "stub" ? undefined : "url(#wireglow)"}
                  />
                );
              })}
            </svg>

            {layout.nodes.map((n) => {
              const isSel = n.id === selectedId;
              const isRoot = n.depth === 0;
              return (
                <div
                  key={n.id}
                  className="absolute"
                  style={{ left: n.cx, top: n.cy, transform: "translate(-50%,-50%)" }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(n.id)}
                    aria-label={`${n.title} — ${STATE_LABEL[n.state]}`}
                    className="grid place-items-center rounded-2xl border-2 bg-card transition-transform duration-150 hover:scale-110"
                    style={{
                      width: NODE,
                      height: NODE,
                      borderColor: ACCENT[n.state],
                      borderStyle: n.state === "stub" ? "dashed" : "solid",
                      boxShadow: GLOW[n.state],
                      outline: isSel ? "2px solid #e6c25f" : "none",
                      outlineOffset: 4,
                    }}
                  >
                    <NodeGlyph state={n.state} root={isRoot} />
                  </button>
                  <div
                    className="absolute left-1/2 top-[68px] -translate-x-1/2 whitespace-nowrap text-center"
                    style={{ width: 132 }}
                  >
                    <div className="truncate text-xs font-semibold text-foreground">
                      {n.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                      {STATE_LABEL[n.state]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* detail */}
        {selected ? (
          <aside className="w-full shrink-0 self-start overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_30px_rgba(0,0,0,.35)] lg:w-80">
            <div
              className="flex items-center gap-3 border-b border-border p-4"
              style={{ background: "radial-gradient(circle at 50% 0%,#3a3020,#2a251d)" }}
            >
              <div
                className="grid size-11 shrink-0 place-items-center rounded-xl border-2"
                style={{ borderColor: ACCENT[selected.state], boxShadow: GLOW[selected.state] }}
              >
                <NodeGlyph state={selected.state} root={selected.depth === 0} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">{selected.title}</h2>
                <div
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: ACCENT[selected.state] }}
                >
                  ★ {STATE_LABEL[selected.state]} · Tier {selected.depth + 1}
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {selected.excerpt || "This page hasn’t been written yet — open it to start."}
              </p>

              {selected.childTitles.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Unlocks
                  </div>
                  <ul className="space-y-1.5">
                    {selected.childTitles.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-sm font-medium">
                        <span className="size-1.5 rounded-full" style={{ background: "#8fae7f" }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Link
                href={`/wiki/${selected.slug}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold text-[#1b180f] shadow-[0_4px_0_#b8902a] transition-transform active:translate-y-0.5 active:shadow-[0_2px_0_#b8902a]"
                style={{ background: "#e6c25f" }}
              >
                Open page
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
