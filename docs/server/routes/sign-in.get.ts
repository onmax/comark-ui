import { defineEventHandler } from "nuxt/server";

// Visit /sign-in to sign in with GitHub. Better Auth starts a sign-in with a POST, so the page makes it and follows the
// URL it answers with; the visitor lands back on the page they came from, or the home page.
export function signInPage() {
  const page = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Sign in</title>
<p id="m" role="status">Signing in with GitHub…</p>
<a id="retry" href="" hidden>Try signing in again</a>
<script>
const current = new URL(location.href);
const target = current.searchParams.get("redirect") || document.referrer || "/";
let callbackURL = "/";
try {
  const back = new URL(target, current);
  if (back.origin === current.origin && !back.pathname.startsWith("//") && !back.pathname.startsWith("/sign-in"))
    callbackURL = back.pathname + back.search + back.hash;
} catch {}
fetch("/api/auth/sign-in/social", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ provider: "github", callbackURL }),
})
  .then((r) => {
    if (!r.ok) throw new Error("Sign-in failed");
    return r.json();
  })
  .then((d) => {
    const url = new URL(d.url);
    if (url.origin !== "https://github.com" || url.pathname !== "/login/oauth/authorize") throw new Error("Invalid sign-in URL");
    location.href = url.href;
  })
  .catch(() => {
    document.getElementById("m").textContent = "Signing in failed. Try again, or contact the project owner if it keeps failing.";
    document.getElementById("retry").hidden = false;
  });
</script>`;
  return new Response(page, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export default defineEventHandler(signInPage);
