import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryMetric } from "./SummaryMetric";
import { formatUSD, formatPct } from "@/lib/calculations";
import type { Metrics } from "@/lib/calculations";

interface PrimaryMetricsCardProps {
  metrics: Metrics | null;
}

export function PrimaryMetricsCard({ metrics }: PrimaryMetricsCardProps) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Market Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">
            {metrics ? formatUSD(metrics.marketValue) : "—"}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardContent className="pt-4">
            <SummaryMetric
              label="Capital Gain / Loss incl. fees"
              value={metrics ? formatUSD(metrics.capitalGainLoss) : "—"}
              pct={metrics ? formatPct(metrics.capitalGainLossPct) : undefined}
              positive={
                metrics ? metrics.capitalGainLoss >= 0 : null
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <SummaryMetric
              label="Return on Invested Capital"
              value={metrics ? formatUSD(metrics.roic) : "—"}
              pct={metrics ? formatPct(metrics.roicPct) : undefined}
              positive={metrics ? metrics.roic >= 0 : null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <SummaryMetric
              label="Return on Total Capital incl. fees"
              value={metrics ? formatUSD(metrics.returnOnTotalCapital) : "—"}
              pct={
                metrics
                  ? formatPct(metrics.returnOnTotalCapitalPct)
                  : undefined
              }
              positive={
                metrics ? metrics.returnOnTotalCapital >= 0 : null
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
