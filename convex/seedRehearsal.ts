import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const PREVIEW_HOST = "youthful-lemming-888.convex.cloud";

function assertRehearsalDeployment() {
  const cloudUrl = process.env.CONVEX_CLOUD_URL;
  if (cloudUrl === undefined || cloudUrl === "") {
    throw new Error("Refusing seed: CONVEX_CLOUD_URL is not set.");
  }
  let host: string;
  try {
    host = new URL(cloudUrl).hostname;
  } catch {
    throw new Error("Refusing seed: CONVEX_CLOUD_URL is not a URL.");
  }
  const local = host === "127.0.0.1" || host === "localhost";
  if (!local && host !== PREVIEW_HOST) {
    throw new Error(`Refusing seed on ${host}.`);
  }
}

export const seed = internalMutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    assertRehearsalDeployment();
    const oldId = await ctx.db.insert("users", {
      name: "Rehearsal fake old user",
      email: "rehearsal-old@example.invalid",
    });
    const trades = [
      {
        type: "BUY" as const,
        date: "2024-01-15",
        priceUSD: 500,
        units: 2,
        transactionCostUSD: 1,
        investedCapitalUSD: 1000,
        totalCapitalOutputUSD: 1001,
        createdAt: 1700000000000,
      },
      {
        type: "BUY" as const,
        date: "2024-06-01",
        priceUSD: 520,
        units: 1,
        transactionCostUSD: 1,
        investedCapitalUSD: 520,
        totalCapitalOutputUSD: 521,
        createdAt: 1710000000000,
      },
      {
        type: "SELL" as const,
        date: "2024-09-01",
        priceUSD: 540,
        units: 0.5,
        transactionCostUSD: 1,
        investedCapitalUSD: 270,
        totalCapitalOutputUSD: 271,
        createdAt: 1720000000000,
      },
    ];
    for (const trade of trades) {
      await ctx.db.insert("transactions", { userId: oldId, ...trade });
    }
    const keys = [
      {
        name: "rehearsal key 1",
        hashedKey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        prefix: "yaft_rehea1",
      },
      {
        name: "rehearsal key 2",
        hashedKey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        prefix: "yaft_rehea2",
      },
    ];
    for (const key of keys) {
      await ctx.db.insert("apiKeys", {
        userId: oldId,
        createdAt: 1700000000000,
        ...key,
      });
    }
    return oldId;
  },
});
