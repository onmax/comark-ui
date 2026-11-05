// A playground link carries its Markdown in the hash, deflated, so nothing is stored anywhere. The pages' examples,
// the playground, and the gallery all write it, in the browser or on the server, so it uses the web's streams.
export const sharingUnsupported =
  "Sharing is unavailable in this browser (raw deflate is not supported).";

function compressionStream(kind: "compress" | "decompress") {
  const Stream =
    kind === "compress" ? globalThis.CompressionStream : globalThis.DecompressionStream;
  if (typeof Stream !== "function") throw new Error(sharingUnsupported);
  try {
    return new Stream("deflate-raw");
  } catch {
    throw new Error(sharingUnsupported);
  }
}

export async function pack(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(compressionStream("compress"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function unpack(code: string) {
  const binary = atob(code.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(compressionStream("decompress"));
  return new Response(stream).text();
}

/** An include reads files, so the playground can't run it. */
export const playable = (source: string) => !/^:+include\b/m.test(source);

export const playLink = async (source: string) => `/play#md=${await pack(source)}`;
