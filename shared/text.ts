// Bundled by the packages that read attribute values or print errors; it isn't a package of its own.

/**
 * A prop value as text. Comark writes strings, numbers, and booleans, so an object, array, function, or missing value
 * is no text. The `typeof` check, unlike `instanceof`, can't throw on a revoked proxy.
 */
export function scalar(value: unknown): string | undefined {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(value);
    default:
      return undefined;
  }
}

/** A prop value as text, without its surrounding whitespace, or empty when it has none. */
export const text = (value: unknown): string => scalar(value)?.trim() ?? "";

/** A prop value as text exactly as written, or empty when it has none. */
export const rawText = (value: unknown): string => scalar(value) ?? "";

export const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** FNV-1a, in base 36: short, and the same every time the same text is hashed, so ids derived from it are stable. */
export function hash(source: string): string {
  let value = 0x811c9dc5;
  for (let at = 0; at < source.length; at++)
    value = Math.imul(value ^ source.charCodeAt(at), 0x01000193);
  return (value >>> 0).toString(36);
}
