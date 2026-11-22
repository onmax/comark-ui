import { readFileSync } from "node:fs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthConsole } from "@vite-hub/auth/console-runtime";
import { drizzle } from "drizzle-orm/node-sqlite";
import { describe, expect, it } from "vite-plus/test";
import authDefinition from "../server/auth.ts";
import { comments } from "../server/comments.ts";
import authorizeConsole from "../server/console-authorize.ts";
import database from "../server/databases/default/index.ts";

const origin = "https://docs.example.test";
const request = new Request(origin);

async function withHostSession(input, check) {
  const db = drizzle(":memory:");
  try {
    for (const name of ["20261026101535_init", "20261122152729_auth-admin"]) {
      db.$client.exec(
        readFileSync(
          new URL(`../server/databases/default/migrations/${name}/migration.sql`, import.meta.url),
          "utf8",
        ),
      );
    }
    const options = authDefinition.options({
      requestOrigin: origin,
      env: {
        auth: {
          secret: { unseal: () => "test-secret-4f85c2b75fbde383708f4d35a7ce8b2c" },
          github: { clientId: { unseal: () => "test" }, clientSecret: { unseal: () => "test" } },
        },
      },
    });
    const auth = betterAuth({
      ...options,
      database: drizzleAdapter(db, { provider: "sqlite", schema: database.schema }),
    });
    const host = createAuthConsole(auth);
    const [userError, holder] = await host.hostUser(input);
    if (userError) throw userError;
    const [sessionError, headers] = await host.hostSession(holder.id, request);
    if (sessionError) throw sessionError;
    const cookie = headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    if (!session) throw new Error("Site Access did not create a usable session cookie");
    expect(session.user.role).toBe(input.roles.join(","));
    expect(session.user.login).toBeNull();
    await check(session.user);
  } finally {
    db.$client.close();
  }
}

describe("Site Access page authorization", () => {
  it("shows Console and Comments to a redeemed member without a GitHub login", async () => {
    await withHostSession(
      {
        name: "Console member",
        email: "hello@onmax.me",
        roles: [
          "console",
          "comments-read",
          "comments-write",
          "comments-resolve",
          "comments-delete",
        ],
      },
      async (user) => {
        expect(await authorizeConsole({ request, via: "page", user })).toBe(true);
        for (const action of ["read", "write", "resolve", "delete"]) {
          expect(await comments.options.authorize?.({ user, action })).toBe(true);
        }
      },
    );
  });

  it("denies a redeemed guest access to shared page threads and Console", async () => {
    await withHostSession({ name: "Guest", roles: ["guest", "comments-write"] }, async (user) => {
      expect(await authorizeConsole({ request, via: "page", user })).toBe(false);
      const subject = { kind: "page", id: "/guide/theming" };
      const thread = { subject };
      for (const action of ["read", "write", "resolve", "delete"]) {
        expect(await comments.options.authorize?.({ user, action, subject, thread })).toBe(false);
        expect(await comments.options.authorize?.({ user, action, subject })).toBe(false);
        expect(await comments.options.authorize?.({ user, action })).toBe(false);
      }
    });
  });

  it("requires team membership and checks each action for Site Access members", async () => {
    await withHostSession(
      { name: "Console member", email: "hello@onmax.me", roles: ["console", "comments-read"] },
      async (user) => {
        expect(await comments.options.authorize?.({ user, action: "read" })).toBe(true);
        expect(await comments.options.authorize?.({ user, action: "write" })).toBe(false);
        expect(
          await comments.options.authorize?.({
            user: { ...user, email: "member@example.test" },
            action: "read",
          }),
        ).toBe(false);
      },
    );
  });

  it("preserves GitHub team and signed RPC authorization", async () => {
    const githubTeamUser = { id: "git", login: "onmax", role: "user" };
    expect(await authorizeConsole({ request, via: "page", user: githubTeamUser })).toBe(true);
    expect(await comments.options.authorize?.({ user: githubTeamUser, action: "delete" })).toBe(
      true,
    );

    const user = { id: "console", email: "member@example.test", role: "console" };
    expect(await authorizeConsole({ request, via: "console", key: "test", user })).toBe(false);
    expect(
      await authorizeConsole({
        request,
        via: "console",
        key: "test",
        user: { ...user, email: "hello@onmax.me" },
      }),
    ).toBe(true);
    expect(await authorizeConsole({ request, via: "cli", key: "test" })).toBe(true);
  });
});
