export const CSV_HEADERS = [
  "Date",
  "Type",
  "Price (USD)",
  "Units",
  "Transaction Cost (USD)",
  "Invested Capital (USD)",
  "Total Capital Output (USD)",
] as const;

export interface CsvRow {
  type: "BUY" | "SELL";
  date: string;
  priceUSD: number;
  units: number;
  transactionCostUSD: number;
}

export interface ParseError {
  row: number;
  reason: string;
}

export interface ParseResult {
  valid: CsvRow[];
  errors: ParseError[];
}

export interface ExportTransaction {
  date: string;
  type: "BUY" | "SELL";
  priceUSD: number;
  units: number;
  transactionCostUSD: number;
  investedCapitalUSD: number;
  totalCapitalOutputUSD: number;
}

export function exportToCsv(transactions: ExportTransaction[]): string {
  const lines: string[] = [CSV_HEADERS.join(",")];
  for (const t of transactions) {
    lines.push(
      [
        t.date,
        t.type,
        t.priceUSD,
        t.units,
        t.transactionCostUSD,
        t.investedCapitalUSD,
        t.totalCapitalOutputUSD,
      ].join(",")
    );
  }
  return lines.join("\n");
}

export function generateTemplate(): string {
  return CSV_HEADERS.join(",") + "\n";
}

export function parseCsv(text: string): ParseResult {
  const valid: CsvRow[] = [];
  const errors: ParseError[] = [];

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    errors.push({ row: 0, reason: "File is empty" });
    return { valid, errors };
  }

  const headerLine = lines[0];
  const expectedHeaders = CSV_HEADERS.join(",");
  if (headerLine !== expectedHeaders) {
    errors.push({
      row: 1,
      reason: `Invalid headers. Expected: "${expectedHeaders}"`,
    });
    return { valid, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = lines[i].split(",");

    if (cols.length !== CSV_HEADERS.length) {
      errors.push({
        row: rowNum,
        reason: `Expected ${CSV_HEADERS.length} columns, got ${cols.length}`,
      });
      continue;
    }

    const [dateStr, typeStr, priceStr, unitsStr, costStr] = cols;

    // Validate date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      errors.push({ row: rowNum, reason: `Invalid date "${dateStr}", expected YYYY-MM-DD` });
      continue;
    }

    // Validate type
    if (typeStr !== "BUY" && typeStr !== "SELL") {
      errors.push({ row: rowNum, reason: `Invalid type "${typeStr}", must be BUY or SELL` });
      continue;
    }

    // Validate numerics
    const priceUSD = parseFloat(priceStr);
    const units = parseFloat(unitsStr);
    const transactionCostUSD = parseFloat(costStr);

    if (isNaN(priceUSD) || priceUSD <= 0) {
      errors.push({ row: rowNum, reason: `Invalid price "${priceStr}"` });
      continue;
    }
    if (isNaN(units) || units <= 0) {
      errors.push({ row: rowNum, reason: `Invalid units "${unitsStr}"` });
      continue;
    }
    if (isNaN(transactionCostUSD) || transactionCostUSD < 0) {
      errors.push({ row: rowNum, reason: `Invalid transaction cost "${costStr}"` });
      continue;
    }

    valid.push({
      type: typeStr as "BUY" | "SELL",
      date: dateStr,
      priceUSD,
      units,
      transactionCostUSD,
    });
  }

  return { valid, errors };
}
