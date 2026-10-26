import { eq } from "drizzle-orm";
import { db } from "vite-hub/database/drizzle";
import { user as userTable } from "../databases/config.ts";

// GitHub logins that may comment on the docs and edit them. Everyone else, signed in or not, is an anonymous visitor.
// Lowercase: GitHub logins are not case sensitive.
const TEAM = ["onmax"];

type Person = { id?: string; login?: unknown } | null | undefined;

// Auth stores the login with the user (server/auth.ts). The Console's policy gets it, and Comments takes its people from
// the Console; a policy that gets the user without it reads the login from the database by id. `nuxt dev` has no GitHub
// OAuth app and runs every call as the user `local`; a build never does.
export async function inTeam(user: Person): Promise<boolean> {
  if (import.meta.dev === true && user?.id === "local") return true;
  const login =
    typeof user?.login === "string"
      ? user.login
      : user?.id
        ? (
            await db
              .select({ login: userTable.login })
              .from(userTable)
              .where(eq(userTable.id, user.id))
              .get()
          )?.login
        : undefined;
  return typeof login === "string" && TEAM.includes(login.toLowerCase());
}
