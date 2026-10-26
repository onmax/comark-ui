import { eq } from "drizzle-orm";
import { db, schema } from "vite-hub/database/drizzle";

// GitHub logins that may comment on the docs and edit them. Everyone else, signed in or not, is an anonymous visitor.
// Lowercase: GitHub logins are not case sensitive.
const TEAM = ["onmax"];

type Person = { id?: string; login?: unknown } | null | undefined;

// Auth stores the login with the user (server/auth.ts). The Console passes it to its policy, but Comments passes only
// the user's id, name, and image, so the login is read from the database by id then. `nuxt dev` has no GitHub OAuth
// app and runs every call as the user `local`; a build never does.
export async function inTeam(user: Person): Promise<boolean> {
  if (import.meta.dev === true && user?.id === "local") return true;
  const login =
    typeof user?.login === "string"
      ? user.login
      : user?.id
        ? (
            await db
              .select({ login: schema.user.login })
              .from(schema.user)
              .where(eq(schema.user.id, user.id))
              .get()
          )?.login
        : undefined;
  return typeof login === "string" && TEAM.includes(login.toLowerCase());
}
