import { Boxes, Cpu, Hash, Sparkles, type LucideIcon } from "lucide-react";

export const metadata = { title: "How taro thinks" };

const pillars: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Hash,
    title: "Definitions live in one place",
    body: "“Customer” is a concept, defined once; the catalog model, the column, and the post point at that definition instead of silently restating — and contradicting — it.",
  },
  {
    icon: Boxes,
    title: "Every node carries its meaning",
    body: "Not just columns and types — a plain-language definition and its grain (“what one row represents”), the facts that keep every downstream count and join honest.",
  },
  {
    icon: Cpu,
    title: "Written for people and machines",
    body: "Because meaning is explicit, a person reading the catalog, a search query, and — eventually — an AI agent all work from the same definitions. No guessing.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            How taro thinks
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            One graph, one meaning.
          </h1>
        </div>
      </div>

      <div className="space-y-5 text-base leading-relaxed text-foreground/90">
        <p>
          In most data orgs the knowledge is scattered across tools that don’t
          talk: the catalog knows a table’s shape, the wiki holds the theory, the
          decision log holds the reasoning, the diagram shows how things relate.
          So the same word — <em>customer</em>, <em>revenue</em>,{" "}
          <em>active user</em> — quietly comes to mean three different things in
          three places, and the contradictions surface later as numbers that
          don’t match and dashboards nobody trusts.
        </p>
        <p>
          taro takes the opposite bet:{" "}
          <strong className="font-semibold text-foreground">
            every artifact is a node in one graph, and meaning is shared, not
            copied.
          </strong>{" "}
          A concept is defined once. A model states what one of its rows
          represents. A decision records <em>why</em> it’s shaped that way — and
          links to the models it shaped. Open any node and you can walk to the
          rest: a model → the concept that defines its terms → the decision that
          motivated it → the post that explains it.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {pillars.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-lg border bg-card p-5">
            <Icon className="mb-3 size-5 text-primary" />
            <p className="mb-1.5 text-sm font-semibold">{title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border bg-primary/5 p-5">
        <p className="text-base leading-relaxed">
          The payoff is coherence. Ask{" "}
          <em>“what is a customer, where is it modeled, and why?”</em> and taro
          answers in one walk of the graph — instead of a meeting.
        </p>
      </div>
    </div>
  );
}
