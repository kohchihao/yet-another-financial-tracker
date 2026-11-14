"use node";

import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import YahooFinance from "yahoo-finance2";

export const fetchCspxPrice = action({
  args: {},
  handler: async (ctx): Promise<{ priceUSD: number; currency: string; fetchedAt: number }> => {
    // Auth 2.0 types `getAuthUserId` against a query `runQuery`. An action ctx
    // on Convex 1.50 does not accept that function's transactionLimits option.
    const userId = await getAuthUserId(
      ctx as unknown as Parameters<typeof getAuthUserId>[0],
    );
    if (!userId) throw new Error("Unauthenticated");

    const yf = new YahooFinance();
    const quote = await yf.quote("CSPX.L");

    if (!quote.regularMarketPrice) {
      throw new Error("Failed to fetch CSPX price from Yahoo Finance");
    }

    return {
      priceUSD: quote.regularMarketPrice,
      currency: quote.currency ?? "USD",
      fetchedAt: Date.now(),
    };
  },
});
