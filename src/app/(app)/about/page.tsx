import { Boxes, Cpu, Hash, Sparkles, type LucideIcon } from "lucide-react";

export const metadata = { title: "How taro thinks" };

const pillars: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Hash,
    title: "Definitions live in one place",
    body: "“Customer” gets defined once. The model, the column, and the post all point at that definition instead of quietly restating it and drifting apart.",
  },
  {
    icon: Boxes,
    title: "Every node carries its meaning",
    body: "A model says what one of its rows is, in plain words, and what its grain is. Columns and types on their own won’t keep your counts and joins honest.",
  },
  {
    icon: Cpu,
    title: "Written for people and machines",
    body: "Meaning is written down, so a person reading the catalog and (eventually) an agent hitting the API both work from the same definitions.",
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
            It’s all one graph.
          </h1>
        </div>
      </div>

      <div className="space-y-5 text-base leading-relaxed text-foreground/90">
        <p>
          In most data orgs the knowledge is scattered across tools that don’t
          talk to each other. The catalog knows a table’s shape, the wiki holds
          the theory, the decision log holds the reasoning, the diagram shows how
          things relate. So the same word (<em>customer</em>, <em>revenue</em>,{" "}
          <em>active user</em>) quietly ends up meaning three different things in
          three places, and you find out later, when the numbers don’t match and
          nobody trusts the dashboard.
        </p>
        <p>
          taro does the opposite.{" "}
          <strong className="font-semibold text-foreground">
            Every artifact is a node in one graph, and meaning is shared instead
            of copied.
          </strong>{" "}
          A concept is defined once. A model says what one of its rows is. A
          decision records why it’s shaped that way and links to the models it
          shaped. Open any node and you can walk to the rest: a model, the
          concept behind it, the decision that drove it, the post that explains
          it.
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
          That’s the whole point. Ask{" "}
          <em>“what’s a customer, where is it modeled, and why?”</em> and you can
          answer it by walking the graph instead of booking a meeting.
        </p>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        For machines: the{" "}
        <a href="/api/context" className="font-medium text-primary hover:underline">
          context bundle
        </a>{" "}
        has every definition, grain, and relationship in one JSON file.
      </p>
    </div>
  );
}
