/// <reference types="vite/client" />
import { registerCore } from "@convex-dev/auth/test";
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
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

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function seedRefreshableSession(t: TestConvex, userId: string, rawToken: string) {
  const hash = await sha256Hex(rawToken);
  await (
    t as TestConvex & {
      runInComponent: (
        name: string,
        handler: (ctx: {
          db: {
            insert: (table: string, doc: Record<string, unknown>) => Promise<string>;
          };
        }) => Promise<void>,
      ) => Promise<void>;
    }
  ).runInComponent("auth", async (ctx) => {
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      component: "auth",
    });
    await ctx.db.insert("refreshTokens", {
      hash,
      sessionId,
      state: "issued",
    });
  });
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

test("refresh refuses a session older than 5 days", async () => {
  process.env.CONVEX_CLOUD_URL = "http://127.0.0.1:3210";
  const start = Date.parse("2026-01-01T00:00:00Z");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(start);
  try {
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

    await seedRefreshableSession(t, userId, "inside-token");
    await seedRefreshableSession(t, userId, "past-token");

    vi.setSystemTime(start + FIVE_DAYS_MS - 1000);
    const inside = await t.mutation(api.auth.refreshSession, {
      refreshToken: "inside-token",
    });
    expect(inside.kind).toBe("rotated");

    vi.setSystemTime(start + FIVE_DAYS_MS + 1000);
    const expired = await t.mutation(api.auth.refreshSession, {
      refreshToken: "past-token",
    });
    expect(expired).toEqual({ kind: "noSession" });
  } finally {
    vi.useRealTimers();
  }
});
