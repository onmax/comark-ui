// Doctor rule examples link to made-up files and a javascript: URL on purpose, so neither the link checker nor the
// prerenderer follows them. The rich-text editor at /play/editor/ is a Vite app that docs/tools.ts builds into static files, which
// the link checker only finds in docs/public.
export const excludedLinks = [
  /^\/census$/,
  /^\/ducks\//,
  /^\/ponds\/?/,
  /^\/doctor\/ducks?\.md$/,
  /^\/doctor\/xref\/(pond|pigeon)\.png$/,
  /^\/(pond-tour|spinner)\.mp4$/,
  /^\/roof\.mp3$/,
  /pond\.example\//,
  /^javascript:/,
  /^\/play\/editor\/?$/,
];
