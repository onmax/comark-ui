// Doctor rule examples link to made-up files and a javascript: URL on purpose, so neither the link checker nor the
// prerenderer follows them. The rich-text editor (packages/ui/playground) isn't part of the docs app yet.
export const excludedLinks = [
  /^\/census$/,
  /^\/ducks\//,
  /^\/ponds\/?/,
  /^\/doctor\/ducks?\.md$/,
  /^\/(pond-tour|spinner)\.mp4$/,
  /^\/roof\.mp3$/,
  /pond\.example\//,
  /^javascript:/,
  /^\/play\/editor\/?$/,
];
