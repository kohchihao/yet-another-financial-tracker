import { Card, CardContent } from "@/components/ui/card";
import { SummaryMetric } from "./SummaryMetric";
import { PriceCard } from "./PriceCard";
import { formatUSD, formatUnits } from "@/lib/calculations";
import type { PriceState } from "@/hooks/usePrice";
import type { Metrics } from "@/lib/calculations";

interface SecondaryMetricsGridProps {
  priceState: PriceState;
  summary:
    | {
        totalUnits: number;
        totalInvestedCapital: number;
        totalCapitalOutput: number;
        totalTransactionCost: number;
      }
    | undefined;
  metrics: Metrics | null;
}

export function SecondaryMetricsGrid({
  priceState,
  summary,
  metrics,
}: SecondaryMetricsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 sm:col-span-1">
        <PriceCard priceState={priceState} />
      </div>

      <Card className="sm:col-span-1">
        <CardContent className="pt-4">
          <SummaryMetric
            label="Total Units Held"
            value={summary ? formatUnits(summary.totalUnits) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Avg Cost / Unit"
            value={metrics ? formatUSD(metrics.avgCostPerUnit) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Avg Cost / Unit w/ Fees"
            value={metrics ? formatUSD(metrics.avgCostPerUnitWithFees) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Total Invested Capital"
            value={summary ? formatUSD(summary.totalInvestedCapital) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Total Transaction Costs"
            value={summary ? formatUSD(summary.totalTransactionCost) : "—"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
