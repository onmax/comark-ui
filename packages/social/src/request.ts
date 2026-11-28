/** A host-provided transport that enforces egress policy at connection time and does not follow redirects. */
export type SocialRequest = (url: URL, init: RequestInit) => Promise<Response>;

const origins = {
  post: new Set(["https://api.fxtwitter.com", "https://public.api.bsky.app"]),
  image: new Set(["https://pbs.twimg.com", "https://cdn.bsky.app"]),
};
const redirects = new Set([301, 302, 303, 307, 308]);

export async function request(
  url: URL,
  purpose: keyof typeof origins,
  init: RequestInit,
  transport?: SocialRequest,
): Promise<Response> {
  for (let hops = 0; ; hops++) {
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error("social requests require HTTPS without credentials");
    if (!transport && !origins[purpose].has(url.origin))
      throw new Error(
        `outbound requests to ${url.origin} require a host-provided request transport`,
      );
    const options = { ...init, redirect: "manual" } satisfies RequestInit;
    const response = await (transport ? transport(new URL(url), options) : fetch(url, options));
    if (!redirects.has(response.status) && response.type !== "opaqueredirect") return response;
    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => {});
    if (!location || hops >= 4) throw new Error("could not follow social request redirect");
    url = new URL(location, url);
  }
}
