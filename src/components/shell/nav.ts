import {
  BookOpen,
  Boxes,
  ClipboardCheck,
  Coins,
  Compass,
  Gauge,
  GitBranch,
  Library,
  Network,
  PenLine,
  ScrollText,
  Search,
  Sparkles,
  Terminal,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match nested routes (e.g. /catalog/lineage under /catalog). */
  match?: (pathname: string) => boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Taro",
    items: [
      {
        label: "Control center",
        href: "/taro",
        icon: Gauge,
        match: (p) => p === "/taro",
      },
      { label: "Conformance", href: "/taro/conformance", icon: ClipboardCheck },
      {
        label: "Cost",
        href: "/taro/cost",
        icon: Coins,
        match: (p) => p === "/taro/cost" || p.startsWith("/taro/cost/"),
      },
    ],
  },
  {
    title: "Knowledge",
    items: [
      { label: "Wiki", href: "/wiki", icon: BookOpen },
      { label: "Glossary", href: "/glossary", icon: Library },
      { label: "Blog", href: "/blog", icon: PenLine },
      { label: "Decisions", href: "/decisions", icon: ScrollText },
    ],
  },
  {
    title: "Practice",
    items: [{ label: "Case Studies", href: "/case-studies", icon: Compass }],
  },
  {
    title: "Catalog",
    items: [
      {
        label: "Models & Sources",
        href: "/catalog",
        icon: Boxes,
        match: (p) => p.startsWith("/catalog") && !p.startsWith("/catalog/lineage"),
      },
      { label: "Lineage", href: "/catalog/lineage", icon: GitBranch },
    ],
  },
  {
    title: "Design",
    items: [
      { label: "ERD", href: "/erd", icon: Network },
      { label: "Graph", href: "/graph", icon: Waypoints },
      { label: "Query", href: "/query", icon: Terminal },
      { label: "Search", href: "/search", icon: Search },
    ],
  },
  {
    title: "About",
    items: [{ label: "How taro thinks", href: "/about", icon: Sparkles }],
  },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  if (item.href === "/wiki" && pathname === "/") return true;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
