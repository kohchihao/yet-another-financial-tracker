"use client";

import { Card, CardContent } from "@/components/ui/card";
import { usePrivacy } from "@/context/PrivacyContext";
import { formatUSD, formatUnits } from "@/lib/calculations";
import type { PriceState } from "@/hooks/usePrice";
import type { Metrics } from "@/lib/calculations";
import { SummaryMetric } from "./SummaryMetric";
import { PriceCard } from "./PriceCard";

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
  const { isPrivate } = usePrivacy();

  function maskUSD(value: string) {
    return isPrivate ? "$****" : value;
  }

  function maskUnits(value: string) {
    return isPrivate ? "****" : value;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 sm:col-span-1">
        <PriceCard priceState={priceState} />
      </div>

      <Card className="sm:col-span-1">
        <CardContent className="pt-4">
          <SummaryMetric
            label="Total Units Held"
            value={summary ? maskUnits(formatUnits(summary.totalUnits)) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Avg Cost / Unit"
            value={metrics ? maskUSD(formatUSD(metrics.avgCostPerUnit)) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Avg Cost / Unit w/ Fees"
            value={metrics ? maskUSD(formatUSD(metrics.avgCostPerUnitWithFees)) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Total Invested Capital"
            value={summary ? maskUSD(formatUSD(summary.totalInvestedCapital)) : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Total Transaction Costs"
            value={summary ? maskUSD(formatUSD(summary.totalTransactionCost)) : "—"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
