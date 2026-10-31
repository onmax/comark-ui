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
// Tailwind's 500 shades, bar a brown for the tenth, read on white and on black, so the defaults work in both themes.
// Past the palette, Flint would merge series into a gray "Others", so there are enough for any table a review holds.
export const SERIES = [
  "#3b82f6",
  "#f97316",
  "#10b981",
  "#a855f7",
  "#f43f5e",
  "#eab308",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#a8774a",
  "#14b8a6",
  "#f59e0b",
] as const;
