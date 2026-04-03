export interface PortfolioSummary {
  totalUnits: number;
  totalInvestedCapital: number;
  totalCapitalOutput: number;
  totalTransactionCost: number;
}

export interface Metrics {
  marketValue: number;
  capitalGainLoss: number;
  capitalGainLossPct: number;
  roic: number;
  roicPct: number;
  returnOnTotalCapital: number;
  returnOnTotalCapitalPct: number;
  avgCostPerUnit: number;
  avgCostPerUnitWithFees: number;
}

export function deriveMetrics(
  summary: PortfolioSummary,
  priceUSD: number
): Metrics {
  const { totalUnits, totalInvestedCapital, totalCapitalOutput } = summary;

  const marketValue = totalUnits * priceUSD;
  const capitalGainLoss = marketValue - totalCapitalOutput;
  const capitalGainLossPct =
    totalCapitalOutput > 0 ? capitalGainLoss / totalCapitalOutput : 0;
  const roic = marketValue - totalInvestedCapital;
  const roicPct =
    totalInvestedCapital > 0 ? roic / totalInvestedCapital : 0;
  const returnOnTotalCapital = marketValue - totalCapitalOutput;
  const returnOnTotalCapitalPct =
    totalCapitalOutput > 0 ? returnOnTotalCapital / totalCapitalOutput : 0;
  const avgCostPerUnit =
    totalUnits > 0 ? totalInvestedCapital / totalUnits : 0;
  const avgCostPerUnitWithFees =
    totalUnits > 0 ? totalCapitalOutput / totalUnits : 0;

  return {
    marketValue,
    capitalGainLoss,
    capitalGainLossPct,
    roic,
    roicPct,
    returnOnTotalCapital,
    returnOnTotalCapitalPct,
    avgCostPerUnit,
    avgCostPerUnitWithFees,
  };
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

export function formatUnits(value: number): string {
  return value.toFixed(4);
}
