'use client';

import { ExportButton } from '@/components/csv/ExportButton';
import { ImportDialog } from '@/components/csv/ImportDialog';
import { AddTransactionSheet } from '@/components/transactions/AddTransactionSheet';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { Separator } from '@/components/ui/separator';
import { api } from '@/convex/_generated/api';
import { useMetrics } from '@/hooks/useMetrics';
import { usePrice } from '@/hooks/usePrice';
import { useQuery } from 'convex/react';
import { PrimaryMetricsCard } from './PrimaryMetricsCard';
import { SecondaryMetricsGrid } from './SecondaryMetricsGrid';

export function DashboardShell() {
  const priceState = usePrice();
  const { summary, metrics } = useMetrics(priceState.effectivePrice);
  const transactions = useQuery(api.transactions.listTransactions) ?? [];

  return (
    <div className="w-full px-4 py-6 space-y-6">
      {/* Primary metrics */}
      <PrimaryMetricsCard metrics={metrics} />

      {/* Secondary metrics grid */}
      <SecondaryMetricsGrid
        priceState={priceState}
        summary={summary}
        metrics={metrics}
      />

      <Separator />

      {/* Transaction table header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold">Transactions</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton />
          <ImportDialog />
          <AddTransactionSheet />
        </div>
      </div>

      {/* Transaction table */}
      <TransactionTable transactions={transactions} />
    </div>
  );
}
