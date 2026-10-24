import type { ElementNode } from "comark";

/**
 * A color: "" for the default, `0` to `15` for the terminal colors, `#rrggbb` for any other, or `inverse` for the other
 * default when a cell is inverted.
 */
type Color = string;

interface Pen {
  fg: Color;
  bg: Color;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  inverse: boolean;
}

interface Cell {
  char: string;
  pen: Pen;
}

const blankPen: Pen = {
  fg: "",
  bg: "",
  bold: false,
  dim: false,
  italic: false,
  underline: false,
  strike: false,
  inverse: false,
};

// East Asian wide and fullwidth characters, and emoji drawn as emoji, take two cells.
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]|\p{Emoji_Presentation}/u;
const COMBINING = /^\p{M}$/u;
const graphemes = new Intl.Segmenter();

const hex = (value: number) => value.toString(16).padStart(2, "0");
const rgb = (r: number, g: number, b: number) => `#${hex(r)}${hex(g)}${hex(b)}`;

// The xterm 256-color palette past the 16 named colors: a 6x6x6 cube, then 24 grays.
function color256(index: number): Color {
  if (index < 16) return String(index);
  if (index < 232) {
    const steps = [0, 95, 135, 175, 215, 255];
    const n = index - 16;
    return rgb(steps[Math.floor(n / 36)]!, steps[Math.floor(n / 6) % 6]!, steps[n % 6]!);
  }
  const gray = 8 + (index - 232) * 10;
  return rgb(gray, gray, gray);
}

const byte = (value: number | undefined) =>
  value !== undefined && Number.isInteger(value) && value >= 0 && value <= 255;

/**
 * A small terminal: enough of xterm to replay what command-line tools print, such as colors, progress bars redrawn with
 * `\r` or cursor moves, and cleared screens. Scrolled-off lines are kept, so a log can show everything.
 */
export class Terminal {
  private cols: number;
  private rows: number;
  private lines: Cell[][] = [];
  private history: Cell[][] = [];
  private saved: { lines: Cell[][]; x: number; y: number } | undefined;
  private x = 0;
  private y = 0;
  private wrap = false;
  private pen: Pen = { ...blankPen };
  private stored = { x: 0, y: 0 };
  private pending = "";

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.lines = this.blank(rows);
  }

  private blank(count: number) {
    return Array.from({ length: count }, (): Cell[] => []);
  }

  resize(cols: number, rows: number) {
    this.cols = cols;
    while (this.lines.length > rows) this.history.push(this.lines.shift()!);
    while (this.lines.length < rows) this.lines.push([]);
    this.rows = rows;
    this.x = Math.min(this.x, cols - 1);
    this.y = Math.min(this.y, rows - 1);
  }

  private lineFeed() {
    if (this.y < this.rows - 1) this.y++;
    else {
      const top = this.lines.shift()!;
      // A full-screen app's alternate screen leaves nothing behind in the log.
      if (!this.saved) this.history.push(top);
      this.lines.push([]);
    }
  }

  private put(char: string) {
    const line = this.lines[this.y]!;
    if (COMBINING.test(char)) {
      const previous = line[Math.max(0, this.x - 1)];
      if (previous) previous.char += char;
      return;
    }
    const width = WIDE.test(char) ? 2 : 1;
    if (this.wrap || this.x + width > this.cols) {
      this.x = 0;
      this.wrap = false;
      this.lineFeed();
    }
    const row = this.lines[this.y]!;
    while (row.length < this.x) row.push({ char: " ", pen: blankPen });
    row[this.x] = { char, pen: this.pen };
    if (width === 2) row[this.x + 1] = { char: "", pen: this.pen };
    this.x += width;
    if (this.x >= this.cols) {
      this.x = this.cols - 1;
      this.wrap = true;
    }
  }

  private erase(row: number, from: number, to: number) {
    const line = this.lines[row];
    if (!line) return;
    for (let x = from; x < Math.min(to, line.length); x++)
      line[x] = { char: " ", pen: { ...blankPen, bg: this.pen.bg } };
    if (to >= line.length && this.pen.bg === "") line.length = Math.min(line.length, from);
  }

  private move(x: number, y: number) {
    this.x = Math.max(0, Math.min(this.cols - 1, x));
    this.y = Math.max(0, Math.min(this.rows - 1, y));
    this.wrap = false;
  }

  private sgr(params: string) {
    const codes = params.split(";").map((param) => param.split(":").map((n) => Number(n || 0)));
    for (let i = 0; i < codes.length; i++) {
      const [code = 0, ...sub] = codes[i]!;
      const pen = { ...this.pen };
      if (code === 0) Object.assign(pen, blankPen);
      else if (code === 1) pen.bold = true;
      else if (code === 2) pen.dim = true;
      else if (code === 3) pen.italic = true;
      else if (code === 4) pen.underline = true;
      else if (code === 7) pen.inverse = true;
      else if (code === 9) pen.strike = true;
      else if (code === 22) pen.bold = pen.dim = false;
      else if (code === 23) pen.italic = false;
      else if (code === 24) pen.underline = false;
      else if (code === 27) pen.inverse = false;
      else if (code === 29) pen.strike = false;
      else if (code >= 30 && code <= 37) pen.fg = String(code - 30);
      else if (code >= 40 && code <= 47) pen.bg = String(code - 40);
      else if (code >= 90 && code <= 97) pen.fg = String(code - 82);
      else if (code >= 100 && code <= 107) pen.bg = String(code - 92);
      else if (code === 39) pen.fg = "";
      else if (code === 49) pen.bg = "";
      else if (code === 38 || code === 48) {
        // `38;5;n` and `38;2;r;g;b`, or the same with colons, where `38:2::r:g:b` may name a color space first.
        const rest = sub.length ? sub : codes.slice(i + 1).map(([n = 0]) => n);
        let value: Color | undefined;
        let used = 0;
        if (rest[0] === 5 && byte(rest[1])) [value, used] = [color256(rest[1]!), 2];
        else if (rest[0] === 2) {
          const channels = sub.length && rest.length > 4 ? rest.slice(2, 5) : rest.slice(1, 4);
          if (channels.length === 3 && channels.every(byte))
            [value, used] = [rgb(channels[0]!, channels[1]!, channels[2]!), sub.length ? 0 : 4];
        }
        if (!sub.length) i += used;
        if (value !== undefined) pen[code === 38 ? "fg" : "bg"] = value;
      }
      this.pen = pen;
    }
  }

  private csi(params: string, final: string) {
    const isPrivate = params.startsWith("?");
    const numbers = params
      .replace(/^[?>=]/, "")
      .split(";")
      .map((n) => Number.parseInt(n, 10));
    const n = (index: number, fallback = 1) => {
      const value = numbers[index];
      return value === undefined || Number.isNaN(value) || value === 0 ? fallback : value;
    };
    if (isPrivate) {
      if (
        (final === "h" || final === "l") &&
        numbers.some((m) => m === 1049 || m === 47 || m === 1047)
      )
        this.alternate(final === "h");
      return;
    }
    switch (final) {
      case "m":
        return this.sgr(params);
      case "A":
        return this.move(this.x, this.y - n(0));
      case "B":
        return this.move(this.x, this.y + n(0));
      case "C":
        return this.move(this.x + n(0), this.y);
      case "D":
        return this.move(this.x - n(0), this.y);
      case "E":
        return this.move(0, this.y + n(0));
      case "F":
        return this.move(0, this.y - n(0));
      case "G":
        return this.move(n(0) - 1, this.y);
      case "d":
        return this.move(this.x, n(0) - 1);
      case "H":
      case "f":
        return this.move(n(1) - 1, n(0) - 1);
      case "K": {
        const mode = n(0, 0);
        if (mode === 0) this.erase(this.y, this.x, Infinity);
        else if (mode === 1) this.erase(this.y, 0, this.x + 1);
        else this.erase(this.y, 0, Infinity);
        return;
      }
      case "J": {
        const mode = n(0, 0);
        if (mode === 0) {
          this.erase(this.y, this.x, Infinity);
          for (let row = this.y + 1; row < this.rows; row++) this.erase(row, 0, Infinity);
        } else if (mode === 1) {
          for (let row = 0; row < this.y; row++) this.erase(row, 0, Infinity);
          this.erase(this.y, 0, this.x + 1);
        } else {
          // A cleared screen is still in the log: what was on it scrolls into the history first.
          if (!this.saved) this.history.push(...this.lines.filter((line) => line.length));
          this.lines = this.blank(this.rows);
          if (mode === 3) this.history = [];
        }
        return;
      }
      case "X":
        return this.erase(this.y, this.x, this.x + n(0));
      case "P":
        this.lines[this.y]!.splice(this.x, n(0));
        return;
      case "@":
        this.lines[this.y]!.splice(
          this.x,
          0,
          ...Array.from({ length: n(0) }, () => ({ char: " ", pen: blankPen })),
        );
        return;
      case "s":
        this.stored = { x: this.x, y: this.y };
        return;
      case "u":
        return this.move(this.stored.x, this.stored.y);
    }
  }

  private alternate(on: boolean) {
    if (on && !this.saved) {
      this.saved = { lines: this.lines, x: this.x, y: this.y };
      this.lines = this.blank(this.rows);
    } else if (!on && this.saved) {
      ({ lines: this.lines, x: this.x, y: this.y } = this.saved);
      this.saved = undefined;
    }
  }

  write(text: string) {
    // One cell per grapheme, so an emoji built from several code points stays whole. `\r\n` is one grapheme too.
    const chars = Array.from(graphemes.segment(this.pending + text), ({ segment }) => segment);
    this.pending = "";
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]!;
      if (char === "\u001b") {
        const next = chars[i + 1];
        if (next === undefined) {
          this.pending = chars.slice(i).join("");
          break;
        }
        if (next === "[") {
          let j = i + 2;
          while (j < chars.length && !/[@-~]/.test(chars[j]!)) j++;
          if (j === chars.length) {
            this.pending = chars.slice(i).join("");
            break;
          }
          this.csi(chars.slice(i + 2, j).join(""), chars[j] ?? "");
          i = j;
        } else if (next === "]" || next === "P" || next === "_" || next === "^") {
          // OSC, DCS, and the like run to BEL or ST; titles and links have nothing to draw.
          let j = i + 2;
          while (
            j < chars.length &&
            chars[j] !== "\u0007" &&
            !(chars[j] === "\u001b" && chars[j + 1] === "\\")
          )
            j++;
          if (j === chars.length) {
            this.pending = chars.slice(i).join("");
            break;
          }
          i = chars[j] === "\u001b" ? j + 1 : j;
        } else if (next === "7") {
          this.stored = { x: this.x, y: this.y };
          i++;
        } else if (next === "8") {
          this.move(this.stored.x, this.stored.y);
          i++;
        } else if (next === "M") {
          if (this.y > 0) this.y--;
          i++;
        } else if (next === "(" || next === ")" || next === "#") i += 2;
        else i++;
      } else if (char === "\r") {
        this.x = 0;
        this.wrap = false;
      } else if (char === "\n" || char === "\r\n") {
        // Recordings carry `\r\n`; a bare `\n` starts the line over too, as hand-written casts expect.
        this.x = 0;
        this.wrap = false;
        this.lineFeed();
      } else if (char === "\b") {
        this.x = Math.max(0, this.x - 1);
        this.wrap = false;
      } else if (char === "\t") this.move((Math.floor(this.x / 8) + 1) * 8, this.y);
      else if (char >= " " && char !== "\u007f") this.put(char);
    }
  }

  /** The screen's lines, or with `log` every line printed, with the blank lines at the end left out. */
  text(log: boolean): Cell[][] {
    const lines = [...(log ? this.history : []), ...this.lines];
    while (lines.length && !lines.at(-1)!.some((cell) => cell.char.trim() || cell.pen.bg !== ""))
      lines.pop();
    return lines;
  }
}

const classOf = (pen: Pen) => {
  let { fg, bg } = pen;
  if (pen.inverse) [fg, bg] = [bg || "inverse", fg || "inverse"];
  const classes = [
    /^\d/.test(fg) ? `cca-f${fg}` : fg === "inverse" ? "cca-fi" : "",
    /^\d/.test(bg) ? `cca-b${bg}` : bg === "inverse" ? "cca-bi" : "",
    pen.bold ? "cca-bold" : "",
    pen.dim ? "cca-dim" : "",
    pen.italic ? "cca-italic" : "",
    pen.underline ? "cca-underline" : "",
    pen.strike ? "cca-strike" : "",
  ].filter(Boolean);
  const style = [
    fg.startsWith("#") ? `color:${fg}` : "",
    bg.startsWith("#") ? `background-color:${bg}` : "",
  ].filter(Boolean);
  return { class: classes.join(" "), style: style.join(";") };
};

/** Lines of cells as text and spans, one span per run of cells that look alike. */
export function toNodes(lines: Cell[][]): (string | ElementNode)[] {
  const nodes: (string | ElementNode)[] = [];
  for (const [index, line] of lines.entries()) {
    if (index) nodes.push("\n");
    // Blanks at the end of a line with no background are padding, not output.
    let end = line.length;
    while (
      end &&
      !line[end - 1]!.char.trim() &&
      line[end - 1]!.pen.bg === "" &&
      !line[end - 1]!.pen.inverse
    )
      end--;
    let run = "";
    let key = "";
    let attrs = { class: "", style: "" };
    const flush = () => {
      if (!run) return;
      if (!attrs.class && !attrs.style) nodes.push(run);
      else
        nodes.push([
          "span",
          {
            ...(attrs.class && { class: attrs.class }),
            ...(attrs.style && { style: attrs.style }),
          },
          run,
        ]);
      run = "";
    };
    for (const cell of line.slice(0, end)) {
      const next = classOf(cell.pen);
      const nextKey = `${next.class}|${next.style}`;
      if (nextKey !== key) {
        flush();
        key = nextKey;
        attrs = next;
      }
      run += cell.char;
    }
    flush();
  }
  return nodes;
}
