import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { defineAuth } from "vite-hub/auth";
import { db, schema } from "vite-hub/database";

// Use GitHub at /sign-in (server/routes/sign-in.get.ts). Only the GitHub team or users with Site Access comment grants
// can comment. Editing happens in the ViteHub Console, which signs its own people in.
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
  // The ViteHub Console's Auth section keeps site access as admin() roles, and refuses to open without it.
  plugins: [admin()],
  // Where /sign-in sends someone who isn't signed in yet. Back on the site, the session turns comment mode on.
  access: { signIn: { provider: "github", callbackURL: "/" } },
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
