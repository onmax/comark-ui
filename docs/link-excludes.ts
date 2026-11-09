// Doctor rule examples link to made-up files and a javascript: URL on purpose, so neither the link checker nor the
// prerenderer follows them. The rich-text editor at /play/editor is a Vite app that docs/tools.ts builds into static files, which
// the link checker only finds in docs/public. A playground link carries its Markdown as base64 in the fragment, whose
// capitals the link checker reports; docs/play-links.ts opens each one instead.
export const excludedLinks = [
  /^\/census$/,
  /^\/census(-north|-south)?\.png$/,
  /^\/pond(-before|-after)?\.png$/,
  /^\/doctor\/chips\/octocat$/,
  /^\/doctor\/broken-anchor#methods$/,
  /^\/ducks\//,
  /^\/ponds/,
  /^\/doctor\/ducks?\.md$/,
  /^\/doctor\/xref\/(pond|pigeon|ducks|roof)\.png$/,
  /^\/(pond-tour|spinner)\.mp4$/,
  /^\/roof\.mp3$/,
  /pond\.example\//,
  /^javascript:/,
  /^\/play\/editor$/,
  /^\/play#/,
];
