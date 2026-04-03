import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionRow } from "./TransactionRow";
import type { Doc } from "@/convex/_generated/dataModel";

interface TransactionTableProps {
  transactions: Doc<"transactions">[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No transactions yet. Add your first trade.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="whitespace-nowrap">Date</TableHead>
            <TableHead className="text-right whitespace-nowrap">Units</TableHead>
            <TableHead className="text-right whitespace-nowrap">Price (USD)</TableHead>
            <TableHead className="hidden sm:table-cell text-right whitespace-nowrap">
              Invested Capital (USD)
            </TableHead>
            <TableHead className="hidden sm:table-cell text-right whitespace-nowrap">
              Tx Cost (USD)
            </TableHead>
            <TableHead className="text-right whitespace-nowrap">Total Output (USD)</TableHead>
            <TableHead className="text-center">Type</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TransactionRow
              key={t._id}
              id={t._id}
              date={t.date}
              type={t.type}
              priceUSD={t.priceUSD}
              units={t.units}
              transactionCostUSD={t.transactionCostUSD}
              investedCapitalUSD={t.investedCapitalUSD}
              totalCapitalOutputUSD={t.totalCapitalOutputUSD}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
