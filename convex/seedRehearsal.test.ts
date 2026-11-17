/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

const LOCAL_URL = "http://127.0.0.1:3210";
const PREVIEW_URL = "https://youthful-lemming-888.convex.cloud";
const PROD_URL = "https://happy-animal-123.convex.cloud";

function withCloudUrl(url: string | undefined) {
  const previous = process.env.CONVEX_CLOUD_URL;
  if (url === undefined) delete process.env.CONVEX_CLOUD_URL;
  else process.env.CONVEX_CLOUD_URL = url;
  return () => {
    if (previous === undefined) delete process.env.CONVEX_CLOUD_URL;
    else process.env.CONVEX_CLOUD_URL = previous;
  };
}

test("seed, dry run, migrate, and deleteOldUser move every seeded row", async () => {
  const restore = withCloudUrl(LOCAL_URL);
  try {
    const t = convexTest(schema, modules);
    const newId = await t.run(async (ctx) =>
      ctx.db.insert("users", { name: "v2 rehearsal user" }),
    );
    const oldId = await t.mutation(internal.seedRehearsal.seed, {});

    const before = await t.query(internal.migrateUserId.report, {
      oldId,
      newId,
    });
    expect(before).toEqual({
      oldUserExists: true,
      newUserExists: true,
      transactions: { old: 3, new: 0 },
      apiKeys: { old: 2, new: 0 },
    });

    const dry = await t.mutation(internal.migrateUserId.migrate, {
      oldId,
      newId,
    });
    expect(dry).toEqual({ dryRun: true, before });
    const afterDry = await t.query(internal.migrateUserId.report, {
      oldId,
      newId,
    });
    expect(afterDry).toEqual(before);

    const moved = await t.mutation(internal.migrateUserId.migrate, {
      oldId,
      newId,
      dryRun: false,
    });
    expect(moved).toMatchObject({
      dryRun: false,
      done: true,
      moved: { transactions: 3, apiKeys: 2 },
      after: {
        oldUserExists: true,
        newUserExists: true,
        transactions: { old: 0, new: 3 },
        apiKeys: { old: 0, new: 2 },
      },
    });

    const transactions = await t.run(async (ctx) =>
      ctx.db.query("transactions").collect(),
    );
    const apiKeys = await t.run(async (ctx) => ctx.db.query("apiKeys").collect());
    expect(transactions).toHaveLength(3);
    expect(apiKeys).toHaveLength(2);
    expect(transactions.every((row) => row.userId === newId)).toBe(true);
    expect(apiKeys.every((row) => row.userId === newId)).toBe(true);
    expect(transactions.some((row) => row.userId === oldId)).toBe(false);
    expect(apiKeys.some((row) => row.userId === oldId)).toBe(false);

    expect(
      await t.mutation(internal.migrateUserId.deleteOldUser, { oldId, newId }),
    ).toBeNull();
    const users = await t.run(async (ctx) => {
      return {
        oldUser: await ctx.db.get(oldId),
        newUser: await ctx.db.get(newId),
      };
    });
    expect(users.oldUser).toBeNull();
    expect(users.newUser).not.toBeNull();
  } finally {
    restore();
  }
});

test("seed refuses a deployment that is not local or the preview", async () => {
  const t = convexTest(schema, modules);
  const restoreUnset = withCloudUrl(undefined);
  await expect(t.mutation(internal.seedRehearsal.seed, {})).rejects.toThrow(
    /Refusing seed/,
  );
  restoreUnset();

  const restoreProd = withCloudUrl(PROD_URL);
  try {
    await expect(t.mutation(internal.seedRehearsal.seed, {})).rejects.toThrow(
      /Refusing seed on happy-animal-123.convex.cloud/,
    );
    const users = await t.run(async (ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(0);
  } finally {
    restoreProd();
  }
});

test.each([LOCAL_URL, PREVIEW_URL])(
  "seed runs when CONVEX_CLOUD_URL is %s",
  async (url) => {
    const restore = withCloudUrl(url);
    try {
      const t = convexTest(schema, modules);
      const oldId = await t.mutation(internal.seedRehearsal.seed, {});
      const user = await t.run(async (ctx) => ctx.db.get(oldId));
      expect(user?.email).toBe("rehearsal-old@example.invalid");
    } finally {
      restore();
    }
  },
);
