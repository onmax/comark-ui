import { defineHandler } from "nitro/h3";
import { withAuth } from "vite-hub/auth/server";

// The team's way in to comment: GitHub sign-in (`access.signIn` in server/auth.ts), then the landing page.
const signIn = withAuth(() => new Response(null, { status: 302, headers: { location: "/" } }));

export default defineHandler((event) => signIn(event.req));
