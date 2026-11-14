/// <reference types="vite/client" />
import { registerCore } from "@convex-dev/auth/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { API_KEY_DISPLAY_LENGTH } from "./lib/apiKeys";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

type TestConvex = ReturnType<typeof convexTest>;

async function signedIn(t: TestConvex, userId: Id<"users">) {
  const sessionId = await (
    t as TestConvex & {
      runInComponent: (
        name: string,
        handler: (ctx: {
          db: {
            insert: (
              table: "sessions",
              doc: { userId: string; component: string },
            ) => Promise<string>;
          };
        }) => Promise<string>,
      ) => Promise<string>;
    }
  ).runInComponent("auth", async (ctx) => {
    return await ctx.db.insert("sessions", {
      userId,
      component: "auth",
    });
  });
  return t.withIdentity({ subject: sessionId });
}

function setup() {
  const t = convexTest(schema, modules);
  registerCore(t);
  return t;
}

test("createApiKey returns a key for a v2 session and rejects a signed-out caller", async () => {
  const t = setup();
  const userId = await t.mutation(internal.users.createUser, {
    method: {
      name: "github",
      profile: {
        id: "1000001",
        login: "marcus-fake",
        emailVerified: true,
      },
    },
  });
  await expect(
    t.action(api.apiKeys.createApiKey, { name: "cli" }),
  ).rejects.toThrow("Unauthenticated");

  const authed = await signedIn(t, userId);
  const created = await authed.action(api.apiKeys.createApiKey, { name: "cli" });
  expect(created.key.startsWith("yaft_")).toBe(true);
  expect(created.prefix).toBe(created.key.slice(0, API_KEY_DISPLAY_LENGTH));
  const stored = await t.run(async (ctx) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  });
  expect(stored?.name).toBe("cli");
  expect(stored?.userId).toBe(userId);
});

test("fetchCspxPrice auth gate allows a v2 session and rejects a signed-out caller", async () => {
  const t = setup();
  const userId = await t.mutation(internal.users.createUser, {
    method: {
      name: "github",
      profile: {
        id: "1000001",
        login: "marcus-fake",
        emailVerified: true,
      },
    },
  });
  await expect(t.action(api.prices.fetchCspxPrice, {})).rejects.toThrow(
    "Unauthenticated",
  );

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("getcrumb")) {
      return new Response("test-crumb", { status: 200 });
    }
    if (url.includes("/v7/finance/quote")) {
      return new Response(
        JSON.stringify({
          quoteResponse: {
            result: [
              {
                language: "en-US",
                region: "US",
                quoteType: "ETF",
                triggerable: true,
                currency: "USD",
                marketState: "REGULAR",
                exchange: "LSE",
                exchangeDataDelayedBy: 0,
                exchangeTimezoneName: "Europe/London",
                exchangeTimezoneShortName: "GMT",
                fullExchangeName: "London",
                gmtOffSetMilliseconds: 0,
                esgPopulated: false,
                market: "gb_market",
                sourceInterval: 15,
                symbol: "CSPX.L",
                tradeable: false,
                regularMarketPrice: 550.25,
              },
            ],
            error: null,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    const response = new Response("", { status: 200 });
    response.headers.getSetCookie = () => [
      "A=b; Domain=.yahoo.com; Path=/",
    ];
    return response;
  };
  try {
    const authed = await signedIn(t, userId);
    const quote = await authed.action(api.prices.fetchCspxPrice, {});
    expect(quote.priceUSD).toBe(550.25);
    expect(quote.currency).toBe("USD");
  } finally {
    globalThis.fetch = realFetch;
  }
});
