// The old site's links end in a slash, `/zoom/#theme`; the docs shell's paths don't. docs/content.ts maps the pages'
// links with it, and the landing its own. The playground is still on the live site during the docs migration.
export const site = (path: string) => {
  if (/^\/play(?:\/|#|\?|$)/.test(path)) return `https://comark-ui.onmax.me${path}`;
  const [, pathname = "", rest = ""] = /^([^#?]*)(.*)$/.exec(path) ?? [];
  if (/\.\w+$/.test(pathname) || pathname === "/") return path;
  return `${pathname.replace(/\/$/, "")}${rest}`;
};
