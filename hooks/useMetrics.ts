'use client';

import { api } from '@/convex/_generated/api';
import { deriveMetrics, type Metrics } from '@/lib/calculations';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

export interface UseMetricsResult {
  summary:
    | {
        totalUnits: number;
        totalInvestedCapital: number;
        totalCapitalOutput: number;
        totalTransactionCost: number;
      }
    | undefined;
  metrics: Metrics | null;
  isLoading: boolean;
}

export function useMetrics(effectivePrice: number | null): UseMetricsResult {
  const summary = useQuery(api.transactions.getPortfolioSummary, "skip");

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
