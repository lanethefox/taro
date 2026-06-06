"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";

import { navSections } from "@/components/shell/nav";
import { globalSearchAction } from "@/app/(app)/search-action";
import type { SearchResult } from "@/lib/search";

type Item = { key: string; label: string; sub?: string; badge: string; href: string };

const NAV_ITEMS: Item[] = navSections.flatMap((s) =>
  s.items.map((it) => ({
    key: `nav:${it.href}`,
    label: it.label,
    badge: "Go to",
    href: it.href,
  })),
);

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K toggles the palette anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search as the user types. (Stale results are hidden by the
  // display gate below rather than cleared synchronously here.)
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) return;
    const t = setTimeout(() => {
      start(async () => setResults(await globalSearchAction(q)));
    }, 150);
    return () => clearTimeout(t);
  }, [query, open]);

  const trimmed = query.trim();
  const navMatches = trimmed
    ? NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(trimmed.toLowerCase()))
    : NAV_ITEMS;

  const items: Item[] = [
    ...navMatches,
    ...(trimmed ? results : []).map((r) => ({
      key: `${r.type}:${r.id}`,
      label: r.title,
      sub: r.snippet,
      badge: r.badge,
      href: r.href,
    })),
  ];

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActive(0);
  }, []);

  function go(item: Item | undefined) {
    if (!item) return;
    close();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === "Escape") {
      close();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span>Search the graph…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border bg-popover shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search pages, concepts, models, sources…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {pending ? (
                <span className="text-[10px] text-muted-foreground">…</span>
              ) : null}
            </div>

            <ul className="max-h-[50vh] overflow-y-auto p-1.5">
              {items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {query.trim() ? "No matches." : "Type to search the graph."}
                </li>
              ) : (
                items.map((item, i) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                        i === active ? "bg-accent text-accent-foreground" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.label}</span>
                        {item.sub ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.sub}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {item.badge}
                      </span>
                      {i === active ? (
                        <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
