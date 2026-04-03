"use client";

// TODO: Re-enable Convex queries once auth is working
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
import { usePrice } from "@/hooks/usePrice";
import { useMetrics } from "@/hooks/useMetrics";
import { PrimaryMetricsCard } from "./PrimaryMetricsCard";
import { SecondaryMetricsGrid } from "./SecondaryMetricsGrid";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { AddTransactionSheet } from "@/components/transactions/AddTransactionSheet";
import { ExportButton } from "@/components/csv/ExportButton";
import { ImportDialog } from "@/components/csv/ImportDialog";
import { Separator } from "@/components/ui/separator";

export function DashboardShell() {
  const priceState = usePrice();
  const { summary, metrics } = useMetrics(priceState.effectivePrice);
  // TODO: Replace with real Convex query once auth is working
  // const transactions = useQuery(api.transactions.listTransactions) ?? [];
  const transactions: never[] = [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
