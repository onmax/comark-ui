import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("nuxt/server", () => ({ defineEventHandler: (handler: () => Response) => handler }));
import { signInPage } from "../docs/server/routes/sign-in.get.ts";

async function visit(
  search = "",
  referrer = "",
  response = Response.json({ url: "https://github.com/login/oauth/authorize?client_id=cms" }),
) {
  const page = await signInPage().text();
  const script = /<script>([\s\S]*?)<\/script>/.exec(page)?.[1];
  if (!script) throw new Error("Sign-in page has no script");
  const location = {
    href: `https://comark-ui.onmax.me/sign-in${search}`,
    origin: "https://comark-ui.onmax.me",
    search,
  };
  const message = { textContent: "" };
  const retry = { hidden: true };
  const fetch = vi.fn().mockResolvedValue(response);
  runInNewContext(script, {
    URL,
    location,
    fetch,
    document: { referrer, getElementById: (id: string) => (id === "m" ? message : retry) },
  });
  await vi.waitFor(() =>
    expect(
      location.href.startsWith("https://github.com/") || message.textContent.includes("failed"),
    ).toBe(true),
  );
  const request = JSON.parse(fetch.mock.calls[0]?.[1].body);
  return { callbackURL: request.callbackURL, location, message, retry };
}

describe("GitHub sign-in page", () => {
  it("returns to the requested Console section without a referrer", async () => {
    const result = await visit("?redirect=%2F_vitehub%2Fcontent%3Fcollection%3Dpages");
    expect(result.callbackURL).toBe("/_vitehub/content?collection=pages");
  });

  it("uses a same-origin referring page when no return URL is supplied", async () => {
    expect((await visit("", "https://comark-ui.onmax.me/zoom/?view=all")).callbackURL).toBe(
      "/zoom/?view=all",
    );
  });

  it.each(["https://example.com/", "//example.com/", "/\\example.com/", "/sign-in"])(
    "rejects return URL %s",
    async (redirect) => {
      expect((await visit(`?redirect=${encodeURIComponent(redirect)}`)).callbackURL).toBe("/");
    },
  );

  it.each([Response.json({ message: "Not configured" }, { status: 500 }), Response.json({})])(
    "shows a retry action when OAuth cannot start",
    async (response) => {
      const result = await visit("", "", response);
      expect(result.location.href).toBe("https://comark-ui.onmax.me/sign-in");
      expect(result.message.textContent).toContain("Signing in failed");
      expect(result.retry.hidden).toBe(false);
    },
  );
});
