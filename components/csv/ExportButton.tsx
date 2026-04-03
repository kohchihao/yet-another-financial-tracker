"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/csv";

export function ExportButton() {
  const transactions = useQuery(api.transactions.listTransactions);

  function handleExport() {
    if (!transactions || transactions.length === 0) return;

    const csv = exportToCsv(
      transactions.map((t) => ({
        date: t.date,
        type: t.type,
        priceUSD: t.priceUSD,
        units: t.units,
        transactionCostUSD: t.transactionCostUSD,
        investedCapitalUSD: t.investedCapitalUSD,
        totalCapitalOutputUSD: t.totalCapitalOutputUSD,
      }))
    );

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `cspx-transactions-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={!transactions || transactions.length === 0}
    >
      <Download className="h-4 w-4 mr-1" />
      Export CSV
    </Button>
  );
}
