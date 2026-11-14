/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

process.env.ALLOWED_GITHUB_LOGIN = "m@example.com";

const allowed = {
  id: "1000001",
  login: "marcus-fake",
  name: "Marcus",
  email: "m@example.com",
  emailVerified: true,
  avatarUrl: "https://example.com/a.png",
};

function method(
  profile: {
    id: string;
    login: string;
    emailVerified: boolean;
    name?: string;
    email?: string;
    avatarUrl?: string;
  },
) {
  return { name: "github" as const, profile };
}

test("createUser inserts an empty user", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(internal.users.createUser, {
    method: method(allowed),
  });
  const user = await t.run(async (ctx) => ctx.db.get(userId));
  expect(user).toMatchObject({ _id: userId });
  expect(user?.name).toBeUndefined();
  expect(user?.email).toBeUndefined();
  expect(user?.image).toBeUndefined();
});

test("onSignIn accepts the allowlisted verified email", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(internal.users.createUser, {
    method: method(allowed),
  });
  expect(
    await t.mutation(internal.users.onSignIn, {
      method: method(allowed),
      userId,
    }),
  ).toBeNull();
  const user = await t.run(async (ctx) => ctx.db.get(userId));
  expect(user).toMatchObject({
    name: "Marcus",
    email: "m@example.com",
    image: "https://example.com/a.png",
  });
});

test("onSignIn rejects a different email", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(internal.users.createUser, {
    method: method(allowed),
  });
  await expect(
    t.mutation(internal.users.onSignIn, {
      method: method({
        ...allowed,
        id: "2000002",
        login: "stranger",
        email: "someone@example.com",
      }),
      userId,
    }),
  ).rejects.toThrow("Unauthorized: this application is private.");
  const user = await t.run(async (ctx) => ctx.db.get(userId));
  expect(user?.email).toBeUndefined();
});

test("onSignIn rejects the allowlisted email when it is unverified", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(internal.users.createUser, {
    method: method(allowed),
  });
  await expect(
    t.mutation(internal.users.onSignIn, {
      method: method({ ...allowed, emailVerified: false }),
      userId,
    }),
  ).rejects.toThrow("Unauthorized: this application is private.");
  const user = await t.run(async (ctx) => ctx.db.get(userId));
  expect(user?.email).toBeUndefined();
});

test("onSignIn rejects a profile with no email", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.mutation(internal.users.createUser, {
    method: method(allowed),
  });
  const { email: _email, ...withoutEmail } = allowed;
  await expect(
    t.mutation(internal.users.onSignIn, {
      method: method(withoutEmail),
      userId,
    }),
  ).rejects.toThrow("Unauthorized: this application is private.");
});
