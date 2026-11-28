import type { ElementNode, Node } from "comark";
import { PLATFORM, PLATFORMS, isPlatform, type Platform } from "./platforms.ts";
import {
  contentOf,
  initialOf,
  isPicture,
  list,
  props,
  timeNode,
  type Data,
  type Issue,
  type Look,
} from "./post.ts";
import { readBody } from "./text.ts";
import { isElement } from "../../../shared/nodes.ts";
import { text } from "../../../shared/text.ts";

/** One message as it's drawn. */
export interface Message {
  from: string;
  avatar?: string;
  time?: ElementNode;
  text: Node[];
  media: ElementNode[];
}

/** A conversation as it's drawn: its messages in order, with whose side each sits on. */
export interface Conversation {
  name: string;
  platform: Platform;
  me?: string;
  title?: string;
  request: boolean;
  messages: Message[];
}

const CONVERSATION_PROPS = ["me", "platform", "title", "request"];
const MESSAGE_PROPS = ["from", "avatar", "time"];

const flagged = (value: unknown) =>
  value !== undefined && value !== false && text(value) !== "false";

/** Reads a written `::conversation` and its `:::message` blocks. */
export function readConversation(
  node: ElementNode,
  name: string,
  data: Data,
  look: Look,
  issues: Issue[],
): Conversation {
  const attrs = props(node, name, "::conversation", CONVERSATION_PROPS, data, issues);
  const written = text(attrs.platform).toLowerCase();
  if (written && !isPlatform(written))
    issues.push({
      rule: "comark/social/unknown-platform",
      message: `${name}: \`platform\` is "${written}", which comark-social doesn't know, so the conversation shows a globe for its logo. Write ${list(PLATFORMS)}, or leave it out.`,
    });
  const platform: Platform = isPlatform(written) ? written : "generic";
  const messages: Message[] = [];
  const stray: string[] = [];
  for (const child of contentOf(node)) {
    if (isElement(child) && child[0] === "message")
      messages.push(
        readMessage(child, `${name}, message ${messages.length + 1}`, platform, data, look, issues),
      );
    else if (isElement(child)) stray.push(child[0]);
    else if (typeof child === "string" && child.trim()) stray.push("text");
  }
  if (stray.length)
    issues.push({
      rule: "comark/social/conversation-content",
      message: `${name} holds ${stray.length === 1 ? `a \`${stray[0]}\`` : `${stray.length} blocks`} outside its messages, and a conversation draws only its \`:::message\` blocks, so ${stray.length === 1 ? "it's" : "they're"} left out. Put the words in a \`:::message\`, or move them out of the conversation.`,
    });
  if (!messages.length)
    issues.push({
      rule: "comark/social/empty-conversation",
      message: `${name} holds no \`:::message\`, so nothing shows. Write a \`:::message{from="…"}\` for each message.`,
    });
  // A sender's avatar, written on any of their messages, shows by all of them.
  const avatars = new Map<string, string>();
  for (const message of messages)
    if (message.avatar && !avatars.has(message.from)) avatars.set(message.from, message.avatar);
  const me = text(attrs.me);
  const title = text(attrs.title);
  return {
    name,
    platform,
    ...(me ? { me } : {}),
    ...(title ? { title } : {}),
    request: flagged(attrs.request),
    messages: messages.map((message) => {
      const avatar = avatars.get(message.from);
      return avatar ? { ...message, avatar } : message;
    }),
  };
}

function readMessage(
  node: ElementNode,
  name: string,
  platform: Platform,
  data: Data,
  look: Look,
  issues: Issue[],
): Message {
  const attrs = props(node, name, ":::message", MESSAGE_PROPS, data, issues);
  const from = text(attrs.from);
  if (!from)
    issues.push({
      rule: "comark/social/missing-sender",
      message: `${name} has no \`from\`, so it shows on the left with no name. Write who sent it, such as \`from="Ada"\`.`,
    });
  const avatar = text(attrs.avatar);
  if (avatar && !isPicture(avatar))
    issues.push({
      rule: "comark/social/invalid-url",
      message: `${name}: \`avatar\` is "${avatar}", which isn't a picture's address, so the message shows the sender's initial. Write an https address, a path, or a \`data:image/\` URI.`,
    });
  const writtenTime = text(attrs.time);
  const time = writtenTime ? sentAt(writtenTime, look) : undefined;
  if (time?.[0] === "span")
    issues.push({
      rule: "comark/social/invalid-time",
      message: `${name}: \`time\` is "${writtenTime}", which isn't a date, so it shows as written. Write an ISO date such as 2026-11-28 or 2026-11-28T09:30:00Z.`,
    });
  const body = readBody(contentOf(node), { platform, host: "" });
  return {
    from,
    ...(avatar && isPicture(avatar) ? { avatar } : {}),
    ...(time ? { time } : {}),
    text: body.text,
    media: body.media,
  };
}

// A message's time: the date, and the time of day when it has one, as a chat shows it.
function sentAt(value: string, look: Look): ElementNode {
  const node = timeNode(value, look);
  const [tag, attrs, label] = node;
  const datetime = text(attrs.datetime);
  if (tag !== "time" || datetime.length <= 10) return node;
  const clock = new Intl.DateTimeFormat(look.locale ?? "en-US", {
    timeStyle: "short",
    timeZone: look.timeZone,
  }).format(new Date(datetime));
  return [tag, attrs, `${text(label)}, ${clock}`];
}

/**
 * Draws a conversation as one card: a header with its title, the platform's logo, and a "Message request" pill, then
 * its messages as bubbles, `me`'s on the right in the primary color and everyone else's on the left by their avatar.
 * Consecutive messages from one sender are a run: the avatar shows by its last message, and the name goes above its
 * first in a group or when the chat has a custom title.
 */
export function drawConversation(chat: Conversation, look: Look): ElementNode | undefined {
  const { messages } = chat;
  if (!messages.length) return undefined;
  const info = PLATFORM[chat.platform];
  const others = [
    ...new Set(messages.map((message) => message.from).filter((from) => from !== chat.me)),
  ];
  const showSenders = others.length > 1 || Boolean(chat.title);
  const people =
    others.length && others.every(Boolean)
      ? new Intl.ListFormat("en", { type: "conjunction" }).format(others)
      : undefined;
  const title = chat.title ?? people;
  const where = chat.platform === "generic" ? "" : ` on ${info.name}`;
  const head: ElementNode = [
    "div",
    { class: "csl-chat-head" },
    ...(title ? [["span", { class: "csl-chat-title" }, title] satisfies ElementNode] : []),
    ...(chat.request
      ? [["span", { class: "csl-request" }, "Message request"] satisfies ElementNode]
      : []),
    ["span", { class: "csl-logo", role: "img", "aria-label": info.name }],
  ];
  const rows = messages.map((message, index): ElementNode => {
    const mine = chat.me !== undefined && message.from === chat.me;
    const start = messages[index - 1]?.from !== message.from;
    const end = messages[index + 1]?.from !== message.from;
    const sender = message.from || "Someone";
    const bubble: ElementNode = [
      "div",
      { class: "csl-bubble" },
      ["span", { class: "csl-sr" }, `${sender}: `],
      ...(message.text.length
        ? [["div", { class: "csl-text" }, ...message.text] satisfies ElementNode]
        : []),
      ...(message.media.length
        ? [
            [
              "div",
              { class: "csl-media", "data-count": String(Math.min(message.media.length, 4)) },
              ...message.media,
            ] satisfies ElementNode,
          ]
        : []),
    ];
    const body: Node[] = [];
    if (showSenders && start && !mine && message.from)
      body.push(["span", { class: "csl-from", "aria-hidden": "true" }, message.from]);
    body.push(bubble);
    if (message.time) body.push(message.time);
    const avatar: ElementNode | undefined =
      mine || !end
        ? undefined
        : message.avatar
          ? [
              "img",
              {
                class: "csl-avatar",
                src: message.avatar,
                alt: "",
                width: "32",
                height: "32",
                "data-zoom": "false",
              },
            ]
          : [
              "span",
              { class: "csl-avatar", "aria-hidden": "true" },
              initialOf(message.from || "?"),
            ];
    return [
      "li",
      {
        class: "csl-message",
        ...(mine ? { "data-me": "" } : {}),
        ...(start ? { "data-start": "" } : {}),
        ...(end ? { "data-end": "" } : {}),
      },
      ...(avatar ? [avatar] : []),
      ["div", { class: "csl-body" }, ...body],
    ];
  });
  return [
    "conversation",
    {
      platform: chat.platform,
      label: chat.title
        ? `${chat.title}, a conversation${where}`
        : `Conversation${people ? ` with ${people}` : ""}${where}`,
      ...(chat.request ? { request: "" } : {}),
      // The messages show links and handles as their platform does, so comark-chips and comark-github leave the card alone.
      ...(look.chips ? { chip: "false" } : {}),
      ...(look.references ? { references: "false" } : {}),
    },
    head,
    ["ol", { class: "csl-messages" }, ...rows],
  ];
}
