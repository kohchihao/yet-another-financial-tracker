"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { formatUSD, formatUnits } from "@/lib/calculations";
import { usePrivacy } from "@/context/PrivacyContext";
import type { Id } from "@/convex/_generated/dataModel";

interface TransactionRowProps {
  id: Id<"transactions">;
  date: string;
  type: "BUY" | "SELL";
  priceUSD: number;
  units: number;
  transactionCostUSD: number;
  investedCapitalUSD: number;
  totalCapitalOutputUSD: number;
}

export function TransactionRow({
  id,
  date,
  type,
  priceUSD,
  units,
  transactionCostUSD,
  investedCapitalUSD,
  totalCapitalOutputUSD,
}: TransactionRowProps) {
  const [deleteId, setDeleteId] = useState<Id<"transactions"> | null>(null);
  const { isPrivate } = usePrivacy();

  const mu = (v: string) => (isPrivate ? "$****" : v);
  const mun = (v: string) => (isPrivate ? "****" : v);

  return (
    <>
      <TableRow>
        <TableCell className="text-sm tabular-nums whitespace-nowrap">{date}</TableCell>
        <TableCell className="text-sm tabular-nums text-right">{mun(formatUnits(units))}</TableCell>
        <TableCell className="text-sm tabular-nums text-right">{mu(formatUSD(priceUSD))}</TableCell>
        {/* Hidden on mobile */}
        <TableCell className="hidden sm:table-cell text-sm tabular-nums text-right">
          {mu(formatUSD(investedCapitalUSD))}
        </TableCell>
        <TableCell className="hidden sm:table-cell text-sm tabular-nums text-right">
          {mu(formatUSD(transactionCostUSD))}
        </TableCell>
        <TableCell className="text-sm tabular-nums text-right">{mu(formatUSD(totalCapitalOutputUSD))}</TableCell>
        <TableCell className="text-center">
          <Badge
            variant={type === "BUY" ? "default" : "destructive"}
            className="text-xs"
          >
            {type}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteId(id)}
            aria-label="Delete transaction"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>

      <DeleteConfirmDialog
        transactionId={deleteId}
        onClose={() => setDeleteId(null)}
      />
    </>
  );
}
