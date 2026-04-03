"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { deriveMetrics, type Metrics } from "@/lib/calculations";

export interface UseMetricsResult {
  summary: {
    totalUnits: number;
    totalInvestedCapital: number;
    totalCapitalOutput: number;
    totalTransactionCost: number;
  } | undefined;
  metrics: Metrics | null;
  isLoading: boolean;
}

export function useMetrics(effectivePrice: number | null): UseMetricsResult {
  const summary = useQuery(api.transactions.getPortfolioSummary);

  const metrics = useMemo(() => {
    if (!summary || effectivePrice === null) return null;
    return deriveMetrics(summary, effectivePrice);
  }, [summary, effectivePrice]);

  return {
    summary,
    metrics,
    isLoading: summary === undefined,
  };
}
