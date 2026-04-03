import { cn } from "@/lib/utils";

interface SummaryMetricProps {
  label: string;
  value: string;
  pct?: string;
  positive?: boolean | null;
  className?: string;
}

export function SummaryMetric({
  label,
  value,
  pct,
  positive,
  className,
}: SummaryMetricProps) {
  const colorClass =
    positive === true
      ? "text-emerald-600 dark:text-emerald-400"
      : positive === false
        ? "text-red-600 dark:text-red-400"
        : "";

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={cn("text-base font-semibold tabular-nums", colorClass)}>
          {value}
        </span>
        {pct !== undefined && (
          <span className={cn("text-sm font-medium tabular-nums", colorClass)}>
            {pct}
          </span>
        )}
      </div>
    </div>
  );
}
