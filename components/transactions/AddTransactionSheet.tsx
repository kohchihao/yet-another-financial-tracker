'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { api } from '@/convex/_generated/api';
import { formatUSD } from '@/lib/calculations';
import { computeTotalUnits } from '@/lib/fifo';
import { useMutation, useQuery } from 'convex/react';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

export function AddTransactionSheet() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [date, setDate] = useState(todayString());
  const [price, setPrice] = useState('');
  const [units, setUnits] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addBuy = useMutation(api.transactions.addBuyTransaction);
  const addSell = useMutation(api.transactions.addSellTransaction);
  const transactions = useQuery(api.transactions.listTransactions) ?? [];

  const totalUnitsHeld = computeTotalUnits(transactions);
  const priceNum = parseFloat(price) || 0;
  const unitsNum = parseFloat(units) || 0;
  const costNum = parseFloat(cost) || 0;
  const investedCapital = priceNum * unitsNum;
  const totalOutput = investedCapital + costNum;

  const sellExceedsHoldings =
    type === 'SELL' && unitsNum > 0 && unitsNum > totalUnitsHeld + 0.00001;

  function reset() {
    setType('BUY');
    setDate(todayString());
    setPrice('');
    setUnits('');
    setCost('');
    setError(null);
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!date || !price || !units) return;
      if (sellExceedsHoldings) return;

      setSubmitting(true);
      setError(null);
      try {
        const args = {
          date,
          priceUSD: parseFloat(price),
          units: parseFloat(units),
          transactionCostUSD: parseFloat(cost) || 0,
        };
        if (type === 'BUY') {
          await addBuy(args);
        } else {
          await addSell(args);
        }
        setOpen(false);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save transaction');
      } finally {
        setSubmitting(false);
      }
    },
    [date, price, units, cost, type, sellExceedsHoldings, addBuy, addSell],
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <SheetTrigger className={buttonVariants({ size: 'sm' })}>
        <Plus className="h-4 w-4 mr-1" />
        Add Transaction
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Transaction</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Type toggle */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex rounded-md overflow-hidden border">
              <button
                type="button"
                onClick={() => setType('BUY')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === 'BUY'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setType('SELL')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  type === 'SELL'
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                SELL
              </button>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (USD)</Label>
            <Input
              id="price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          {/* Units */}
          <div className="space-y-1.5">
            <Label htmlFor="units">Units</Label>
            <Input
              id="units"
              type="text"
              inputMode="decimal"
              placeholder="0.0000"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              required
            />
            {sellExceedsHoldings && (
              <p className="text-xs text-destructive">
                You hold {totalUnitsHeld.toFixed(4)} units — cannot sell{' '}
                {unitsNum.toFixed(4)}.
              </p>
            )}
          </div>

          {/* Transaction cost */}
          <div className="space-y-1.5">
            <Label htmlFor="cost">Transaction Cost (USD)</Label>
            <Input
              id="cost"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>

          {/* Derived fields (read-only) */}
          <div className="rounded-md bg-muted/50 p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invested Capital</span>
              <span className="tabular-nums font-medium">
                {formatUSD(investedCapital)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Total Capital Output
              </span>
              <span className="tabular-nums font-medium">
                {formatUSD(totalOutput)}
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={
              submitting || sellExceedsHoldings || !date || !price || !units
            }
          >
            {submitting ? 'Saving...' : 'Save Transaction'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}
