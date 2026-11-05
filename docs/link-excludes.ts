// Doctor rule examples link to made-up files and a javascript: URL on purpose, so neither the link checker nor the
// prerenderer follows them. Playground links point at the live site during the docs migration.
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
  /^https:\/\/comark-ui\.onmax\.me\/play(?:\/|#|\?|$)/,
];
