import { defineEventHandler } from "nuxt/server";

// Visit /sign-in to sign in with GitHub. Better Auth starts a sign-in with a POST, so the page makes it and follows the
// URL it answers with; the visitor lands back on the page they came from, or the home page.
export default defineEventHandler(() => {
  const page = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Sign in</title>
<p id="m">Signing in with GitHub…</p>
<script>
const back = new URL(document.referrer || "/", location.href);
fetch("/api/auth/sign-in/social", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ provider: "github", callbackURL: back.origin === location.origin ? back.pathname + back.search : "/" }),
})
  .then((r) => r.json())
  .then((d) => { location.href = d.url; })
  .catch(() => { document.getElementById("m").textContent = "Signing in failed. Reload to try again."; });
</script>`;
  return new Response(page, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
});
