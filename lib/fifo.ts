export interface Transaction {
  type: "BUY" | "SELL";
  date: string;
  units: number;
  priceUSD: number;
  createdAt: number;
}

export interface Lot {
  date: string;
  units: number;
  priceUSD: number;
}

export function computeTotalUnits(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    return sum + (t.type === "BUY" ? t.units : -t.units);
  }, 0);
}

export function buildFifoLots(transactions: Transaction[]): Lot[] {
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt - b.createdAt;
  });

  const lots: Lot[] = [];

  for (const t of sorted) {
    if (t.type === "BUY") {
      lots.push({ date: t.date, units: t.units, priceUSD: t.priceUSD });
    } else {
      let toDeduct = t.units;
      while (toDeduct > 0.00001 && lots.length > 0) {
        const lot = lots[0];
        if (lot.units <= toDeduct + 0.00001) {
          toDeduct -= lot.units;
          lots.shift();
        } else {
          lot.units -= toDeduct;
          toDeduct = 0;
        }
      }
    }
  }

  return lots;
}

export function validateSell(
  lots: Lot[],
  sellUnits: number
): { valid: true; remainingAfter: number } | { valid: false; deficit: number } {
  const totalHeld = lots.reduce((sum, l) => sum + l.units, 0);
  if (sellUnits > totalHeld + 0.00001) {
    return { valid: false, deficit: sellUnits - totalHeld };
  }
  return { valid: true, remainingAfter: totalHeld - sellUnits };
}
