/** Whether a string parses as an http or https URL. The parser rejects those without a host, so none is checked. */
export function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
