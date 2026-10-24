/** An XML element: its name, attributes, child elements, and the text directly inside it. */
export interface XmlElement {
  name: string;
  attributes: Record<string, string>;
  children: XmlElement[];
  text: string;
}

/** Why a document isn't well-formed, and the line where that shows. */
export class XmlError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}

const ENTITIES = new Map([
  ["lt", "<"],
  ["gt", ">"],
  ["amp", "&"],
  ["quot", '"'],
  ["apos", "'"],
]);
const NAME = /[A-Za-z_:][\w:.-]*/y;
const ATTRIBUTE = /\s+([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/y;

function decode(text: string, line: () => number) {
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);|&/gi, (whole, entity: string | undefined) => {
    if (!entity) throw new XmlError("a bare `&` must be written `&amp;`", line());
    if (entity[0] !== "#") {
      const known = ENTITIES.get(entity);
      if (known === undefined) throw new XmlError(`\`&${entity};\` isn't an XML entity`, line());
      return known;
    }
    const code =
      entity[1] === "x" || entity[1] === "X"
        ? Number.parseInt(entity.slice(2), 16)
        : Number(entity.slice(1));
    const allowed =
      code === 0x9 ||
      code === 0xa ||
      code === 0xd ||
      (code >= 0x20 && code <= 0xd7ff) ||
      (code >= 0xe000 && code <= 0xfffd) ||
      (code >= 0x10000 && code <= 0x10ffff);
    if (!allowed) {
      throw new XmlError(`\`${whole}\` isn't a character`, line());
    }
    return String.fromCodePoint(code);
  });
}

/**
 * Parses the XML a test runner writes: elements, attributes, text, CDATA, comments, and the prolog. It refuses what
 * isn't well-formed, such as a tag closed by the wrong name or one never closed, and doesn't resolve DTDs, so no
 * document can make it load anything.
 */
export function parseXml(source: string): XmlElement {
  let at = 0;
  const line = () => source.slice(0, at).split("\n").length;
  const fail = (message: string): never => {
    throw new XmlError(message, line());
  };
  const stack: XmlElement[] = [];
  let root: XmlElement | undefined;
  while (at < source.length) {
    const lt = source.indexOf("<", at);
    const text = source.slice(at, lt === -1 ? source.length : lt);
    const open = stack.at(-1);
    if (open) {
      if (text.includes("]]>")) fail("the `]]>` sequence is only valid inside CDATA");
      open.text += decode(text, line);
    } else if (text.trim()) fail("there's text outside the root element");
    if (lt === -1) break;
    at = lt;
    if (source.startsWith("<?", at)) {
      const end = source.indexOf("?>", at);
      if (end === -1) fail("a `<?` is never closed with `?>`");
      at = end + 2;
    } else if (source.startsWith("<!--", at)) {
      const end = source.indexOf("-->", at);
      if (end === -1) fail("a comment is never closed with `-->`");
      const body = source.slice(at + 4, end);
      if (body.includes("--") || body.endsWith("-")) {
        fail("a comment contains an invalid `--` sequence");
      }
      at = end + 3;
    } else if (source.startsWith("<![CDATA[", at)) {
      const end = source.indexOf("]]>", at);
      if (end === -1) fail("a CDATA section is never closed with `]]>`");
      if (!open) fail("there's CDATA outside the root element");
      else open.text += source.slice(at + 9, end);
      at = end + 3;
    } else if (source.startsWith("<!", at)) {
      if (!source.startsWith("<!DOCTYPE", at) || !/[\s]/.test(source[at + 9] ?? "")) {
        fail("an XML declaration is unsupported");
      }
      // A doctype is skipped, not read, internal subset and all.
      let quote = "";
      let subset = 0;
      let end = -1;
      for (let i = at + 9; i < source.length; i++) {
        if (source.startsWith("<!--", i)) {
          const commentEnd = source.indexOf("-->", i + 4);
          if (commentEnd === -1) fail("a comment is never closed with `-->`");
          const body = source.slice(i + 4, commentEnd);
          if (body.includes("--") || body.endsWith("-")) {
            fail("a comment contains an invalid `--` sequence");
          }
          i = commentEnd + 2;
          continue;
        }
        const char = source[i];
        if (quote) {
          if (char === quote) quote = "";
        } else if (char === '"' || char === "'") {
          quote = char;
        } else if (char === "[") {
          subset++;
        } else if (char === "]" && subset) {
          subset--;
        } else if (char === ">" && subset === 0) {
          end = i;
          break;
        }
      }
      if (end === -1 || !/^<!DOCTYPE\s+[A-Za-z_:][\w:.-]*/.test(source.slice(at, end))) {
        fail("a doctype is malformed or never closed");
      }
      at = end + 1;
    } else if (source.startsWith("</", at)) {
      at += 2;
      NAME.lastIndex = at;
      const name = NAME.exec(source)?.[0] ?? fail("a closing tag has no name");
      at = NAME.lastIndex;
      const end = source.indexOf(">", at);
      if (end === -1 || source.slice(at, end).trim()) fail(`\`</${name}\` isn't closed with \`>\``);
      at = end + 1;
      const element = stack.pop();
      if (!element) fail(`\`</${name}>\` closes nothing`);
      else if (element.name !== name) fail(`\`</${name}>\` closes \`<${element.name}>\``);
    } else {
      at++;
      NAME.lastIndex = at;
      const name = NAME.exec(source)?.[0] ?? fail("a `<` starts no tag; write it `&lt;`");
      at = NAME.lastIndex;
      const element: XmlElement = { name, attributes: {}, children: [], text: "" };
      for (;;) {
        ATTRIBUTE.lastIndex = at;
        const attribute = ATTRIBUTE.exec(source);
        if (!attribute) break;
        const [, key = "", double, single] = attribute;
        if (key in element.attributes) fail(`\`<${name}>\` has \`${key}\` twice`);
        element.attributes[key] = decode(double ?? single ?? "", line);
        at = ATTRIBUTE.lastIndex;
      }
      const close = /\s*(\/?)>/y;
      close.lastIndex = at;
      const end =
        close.exec(source) ??
        fail(
          `\`<${name}\` has an attribute that isn't \`name="value"\`, or isn't closed with \`>\``,
        );
      at = close.lastIndex;
      if (open) open.children.push(element);
      else if (root) fail("there's a second root element");
      else root = element;
      if (!end[1]) stack.push(element);
    }
  }
  const unclosed = stack.at(-1);
  if (unclosed) throw new XmlError(`\`<${unclosed.name}>\` is never closed`, line());
  return root ?? fail("there's no element");
}
