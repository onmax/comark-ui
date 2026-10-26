// Load the generated environment augmentation for checks outside Nuxt's TypeScript project too.
import type {} from "../.vitehub/types.d.ts";
import type {} from "../.vitehub/types/auth.d.ts";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { defineAuth } from "vite-hub/auth";
import { db, schema } from "vite-hub/database/drizzle";

// Sign in with GitHub, nothing else. Anyone can sign in; only the logins in server/utils/team.ts can then comment or edit.
export default defineAuth(({ env, requestOrigin }) => ({
  appName: "comark ui",
  baseURL: requestOrigin,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  secret: env.auth.secret.unseal(),
  socialProviders: {
    github: {
      clientId: env.auth.github.clientId.unseal(),
      clientSecret: env.auth.github.clientSecret.unseal(),
      mapProfileToUser: (profile: { login: string }) => ({ login: profile.login }),
      // The login is how the policies know someone, so it follows the account on every sign-in.
      overrideUserInfoOnSignIn: true,
    },
  },
  // Not `input: false`: Better Auth drops such a field from the GitHub profile too, so the login would never be stored.
  user: { additionalFields: { login: { type: "string", required: false } } },
  // A name can be changed, a login only by GitHub.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/update-user" && ctx.body && "login" in ctx.body)
        throw new APIError("BAD_REQUEST", { message: "The GitHub login can't be changed." });
    }),
  },
}));
