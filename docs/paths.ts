// The old site's links end in a slash, `/zoom/#theme`; the docs shell's paths don't. docs/content.ts maps the pages'
// links with it, and the landing its own.
export const site = (path: string) => {
  const [, pathname = "", rest = ""] = /^([^#?]*)(.*)$/.exec(path) ?? [];
  if (/\.\w+$/.test(pathname) || pathname === "/") return path;
  return `${pathname.replace(/\/$/, "")}${rest}`;
};
