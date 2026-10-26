import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
  // `input: false` keeps /update-user from setting it: a name can be changed, a login only by GitHub.
  user: { additionalFields: { login: { type: "string", required: false, input: false } } },
}));
