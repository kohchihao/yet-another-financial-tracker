"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePrivacy } from '@/context/PrivacyContext';
import type { Metrics } from '@/lib/calculations';
import { formatPct, formatUSD } from '@/lib/calculations';
import { Eye, EyeOff } from 'lucide-react';
import { SummaryMetric } from './SummaryMetric';

interface PrimaryMetricsCardProps {
  metrics: Metrics | null;
}

export function PrimaryMetricsCard({ metrics }: PrimaryMetricsCardProps) {
  const { isPrivate, togglePrivacy } = usePrivacy();

  function mask(value: string, prefix = '') {
    return isPrivate ? `${prefix}****` : value;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Market Value
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={togglePrivacy}
            aria-label={isPrivate ? 'Show values' : 'Hide values'}
          >
            {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">
            {metrics ? mask(formatUSD(metrics.marketValue), '$') : '—'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Capital Gain / Loss incl. fees"
            value={metrics ? mask(formatUSD(metrics.capitalGainLoss), '$') : '—'}
            pct={metrics ? mask(formatPct(metrics.capitalGainLossPct)) : undefined}
            positive={isPrivate ? null : (metrics ? metrics.capitalGainLoss >= 0 : null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Return on Invested Capital"
            value={metrics ? mask(formatUSD(metrics.roic), '$') : '—'}
            pct={metrics ? mask(formatPct(metrics.roicPct)) : undefined}
            positive={isPrivate ? null : (metrics ? metrics.roic >= 0 : null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <SummaryMetric
            label="Return on Total Capital incl. fees"
            value={metrics ? mask(formatUSD(metrics.returnOnTotalCapital), '$') : '—'}
            pct={
              metrics ? mask(formatPct(metrics.returnOnTotalCapitalPct)) : undefined
            }
            positive={isPrivate ? null : (metrics ? metrics.returnOnTotalCapital >= 0 : null)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
