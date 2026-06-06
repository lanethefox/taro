import {
  BookOpen,
  Boxes,
  Compass,
  GitBranch,
  Network,
  PenLine,
  ScrollText,
  Search,
  Sparkles,
  Tag,
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
    title: "Knowledge",
    items: [
      { label: "Wiki", href: "/wiki", icon: BookOpen },
      { label: "Blog", href: "/blog", icon: PenLine },
      { label: "Decisions", href: "/decisions", icon: ScrollText },
      { label: "Tags", href: "/tags", icon: Tag },
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
