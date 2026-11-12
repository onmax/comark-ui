/**
 * The colors the SVG is drawn with. Each is the light theme's value of a CSS variable, so the SVG reads on its own,
 * and the stylesheet swaps each one for its variable, which follows the page's theme and dark mode.
 */
export const INK = {
  foreground: "#0a0a0a",
  muted: "#737373",
  border: "#e5e5e5",
  // Flint lightens a quiet grid from `border`.
  grid: "#ececec",
  background: "#ffffff",
} as const;
// Muted tones at one lightness in OKLCH (0.66), so no series shouts over another: each reads at 3:1 on white and 6:1 on
// black, so the defaults work in both themes. Past the palette, Flint would merge series into a gray "Others", so
// there are enough for any table a review holds.
export const SERIES = [
  "#4d97de",
  "#bb8558",
  "#3ca694",
  "#a37ecd",
  "#da6a76",
  "#b8892d",
  "#419fc0",
  "#69a45c",
  "#c673a3",
  "#8693a5",
  "#90994e",
  "#8489da",
] as const;
