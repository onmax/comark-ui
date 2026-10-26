import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { defineAuth } from "vite-hub/auth";
import { db, schema } from "vite-hub/database/drizzle";
import type { SecretEnv } from "vite-hub/env";

// Sign in with GitHub, nothing else. Anyone can sign in; only the logins in server/utils/team.ts can then comment or edit.
export default defineAuth(({ env, requestOrigin }) => {
  // Matches vite.env.server.auth in nuxt.config.ts. The pilot's Auth context
  // does not infer the Nuxt env declarations during standalone lint/typechecking.
  const auth = env.auth as {
    secret: SecretEnv<string>;
    github: { clientId: SecretEnv<string>; clientSecret: SecretEnv<string> };
  };
  return {
    appName: "comark ui",
    baseURL: requestOrigin,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    secret: auth.secret.unseal(),
    socialProviders: {
      github: {
        clientId: auth.github.clientId.unseal(),
        clientSecret: auth.github.clientSecret.unseal(),
        mapProfileToUser: (profile: { login: string }) => ({ login: profile.login }),
        // The login is how the policies know someone, so it follows the account on every sign-in.
        overrideUserInfoOnSignIn: true,
      },
    },
    // `input: false` keeps /update-user from setting it: a name can be changed, a login only by GitHub.
    user: { additionalFields: { login: { type: "string", required: false, input: false } } },
  };
});
