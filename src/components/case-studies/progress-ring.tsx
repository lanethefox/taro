import { cn } from "@/lib/utils";

/** A soft circular progress indicator (cozy, not loud). */
export function ProgressRing({
  done,
  total,
  size = 56,
  stroke = 6,
  color = "var(--sage)",
  className,
  label,
}: {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
  label?: string;
}) {
  const pct = total === 0 ? 0 : done / total;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className={cn("relative inline-flex", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 500ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-semibold">{Math.round(pct * 100)}%</span>
        {label ? (
          <span className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** A horizontal "tiles filling in" bar — the landscape filling up. */
export function TileBar({
  done,
  total,
  className,
  color = "var(--sage)",
}: {
  done: number;
  total: number;
  className?: string;
  color?: string;
}) {
  return (
    <div className={cn("flex gap-1", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="h-2 flex-1 rounded-[3px] transition-colors"
          style={{
            backgroundColor: i < done ? color : "var(--border)",
            minWidth: 6,
          }}
        />
      ))}
    </div>
  );
}
