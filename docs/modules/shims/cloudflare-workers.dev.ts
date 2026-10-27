// `nuxt dev` runs on Node, which has no `cloudflare:workers`. This is Nitro's dev shim for it: `env` reads
// `globalThis.__env__`, where ViteHub stores the request's bindings, then the process environment.
const read = (key: string | symbol) => {
  const bindings = (globalThis as { __env__?: Record<string | symbol, unknown> }).__env__;
  return bindings && key in bindings
    ? bindings[key]
    : (process.env as Record<string | symbol, unknown>)[key];
};

export const env = new Proxy({} as Record<string, unknown>, {
  get: (_, key) => read(key),
  has: (_, key) => read(key) !== undefined,
});

export async function waitUntil(promise: Promise<unknown>) {
  await (globalThis as { __wait_until__?: (p: Promise<unknown>) => unknown }).__wait_until__?.(
    promise,
  );
}

export function withEnv(): never {
  throw new Error("cf.withEnv is not implemented in dev env currently.");
}
