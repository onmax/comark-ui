declare global {
  interface Window {
    __comarkMedia?: { users: number; stop: () => void; sync: () => void };
  }
  // Safari's, on an iPhone, which has no full screen for any other element.
  interface HTMLVideoElement {
    webkitEnterFullscreen?: () => void;
  }
}

const icon = (name: string, paths: string, fill: boolean) =>
  `<svg class="cm-icon-${name}" viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const speaker =
  '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/>';

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];
// Radios, so the arrow keys move between a row's choices; the script names each player's, since names are per page.
const option = (name: string, label: string, paths: string, choices: string[][]) =>
  `<span class="cm-option">${icon(name, paths, false)}${label}</span><span class="cm-choices" role="radiogroup" aria-label="${label}">` +
  choices
    .map(
      ([value, text]) =>
        `<label><input type="radio" data-option="${name}" value="${value}">${text}</label>`,
    )
    .join("") +
  "</span>";

/**
 * A player's controls, the same in every renderer: play, the time, volume, and a settings panel for the speed and
 * looping; a video's add a full screen button. They show once the script runs;
 * until then, and when the file can't play, the browser's own controls show instead.
 */
export const controls = (kind: "audio" | "video") =>
  `<button type="button" class="cm-play" aria-label="Play">${icon("play", '<path d="M6 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 6 4.5z"/>', true)}${icon("pause", '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>', true)}</button>` +
  '<span class="cm-time">0:00</span><input type="range" class="cm-seek" min="0" max="0" step="any" value="0" aria-label="Seek"><span class="cm-time">0:00</span>' +
  `<span class="cm-sound"><button type="button" class="cm-mute" aria-label="Mute">${icon("volume", `${speaker}<path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>`, false)}${icon("muted", `${speaker}<path d="m22 9-6 6"/><path d="m16 9 6 6"/>`, false)}</button>` +
  '<span class="cm-level"><input type="range" class="cm-volume" min="0" max="1" step="0.05" value="1" aria-label="Volume"></span></span>' +
  `<span class="cm-more"><button type="button" class="cm-settings" aria-label="Settings" aria-expanded="false">${icon("settings", '<path d="M14 17H5"/><path d="M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>', false)}</button>` +
  '<span class="cm-menu">' +
  option(
    "speed",
    "Speed",
    '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    SPEEDS.map((speed) => [String(speed), `${speed}&#215;`]),
  ) +
  option(
    "loop",
    "Loop",
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    [
      ["off", "Off"],
      ["on", "On"],
    ],
  ) +
  "</span></span>" +
  (kind === "video"
    ? `<button type="button" class="cm-full" aria-label="Full screen">${icon("full", '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>', false)}${icon("exit", '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>', false)}</button>`
    : "");

/**
 * Adds the styles and starts every `.cm-audio` and `.cm-video` player on the page, and returns a function that stops
 * them. Every caller shares one set of listeners on the document, which stop with the last caller; a player added later
 * starts when its file's length loads. The function is self-contained: the HTML renderer inlines its source as a
 * script, so it must not use anything from outside its body.
 */
export function start(css: string): () => void {
  const running = window.__comarkMedia;
  if (running) {
    running.users++;
    running.sync();
    return running.stop;
  }
  const listeners = new AbortController();
  const signal = listeners.signal;
  // The page may already carry the styles: the HTML renderer inlines them, and apps can import style.css.
  const style = document.querySelector("style[data-comark-media],link[data-comark-media]")
    ? null
    : document.createElement("style");
  if (style) {
    style.setAttribute("data-comark-media", "");
    style.textContent = css;
    document.head.append(style);
  }

  const two = (value: number) => String(value).padStart(2, "0");
  const clock = (time: number) => {
    const seconds = Math.floor(time);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    return `${hours ? `${hours}:${two(minutes)}` : minutes}:${two(seconds % 60)}`;
  };
  const players = ".cm-audio,.cm-video";
  const playerOf = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLElement>(players) : null;
  const mediaOf = (player: Element) =>
    player.querySelector<HTMLMediaElement>(":scope>audio,:scope>video");
  // A poster sizes its video before the file does, but the video doesn't say when its poster loads, so the script
  // loads the poster too and remembers which URL gives each video its size.
  const posters = new WeakMap<HTMLVideoElement, { src: string; loaded: boolean }>();
  const posterSized = (video: HTMLVideoElement, player: HTMLElement) => {
    const src = video.poster;
    if (!src) {
      posters.delete(video);
      return false;
    }
    let poster = posters.get(video);
    if (poster?.src !== src) {
      poster = { src, loaded: false };
      posters.set(video, poster);
      const current = poster;
      const image = new Image();
      image.addEventListener(
        "load",
        () => {
          if (posters.get(video) !== current || video.poster !== src) return;
          current.loaded = true;
          draw(player);
        },
        { signal },
      );
      image.src = src;
    }
    return poster.loaded;
  };
  // A stream has no end, so it gets no length and no seeking.
  const length = (media: HTMLMediaElement) =>
    Number.isFinite(media.duration) ? media.duration : 0;

  function draw(player: HTMLElement) {
    const media = mediaOf(player);
    if (!media) return;
    const total = length(media);
    const at = Math.min(media.currentTime, total);
    player.setAttribute("data-media-ready", "");
    player.toggleAttribute("data-playing", !media.paused);
    const level = media.muted ? 0 : media.volume;
    player.toggleAttribute("data-muted", !level);
    player.toggleAttribute("data-error", Boolean(media.error));
    if (media instanceof HTMLVideoElement) {
      // A video that can't play gets the browser's controls back, so they can say why.
      media.controls = Boolean(media.error);
      player.toggleAttribute("data-sized", media.videoWidth > 0 || posterSized(media, player));
      // A frame without the fullscreen permission can't go full screen, so the button would do nothing.
      const full = player.querySelector<HTMLElement>(".cm-full");
      if (full) full.hidden = !document.fullscreenEnabled && !media.webkitEnterFullscreen;
    }
    player.querySelector(".cm-play")?.setAttribute("aria-label", media.paused ? "Play" : "Pause");
    player.querySelector(".cm-mute")?.setAttribute("aria-label", level ? "Mute" : "Unmute");
    const volume = player.querySelector<HTMLInputElement>(".cm-volume");
    if (volume) {
      volume.value = String(level);
      volume.style.setProperty("--cm-at", `${level * 100}%`);
      volume.setAttribute("aria-valuetext", `${Math.round(level * 100)}%`);
    }
    const [now, end] = player.querySelectorAll(".cm-time");
    if (now) now.textContent = clock(at);
    if (end) end.textContent = clock(total);
    for (const input of player.querySelectorAll<HTMLInputElement>(".cm-choices input")) {
      // One name per row and player, so each row is its own group of radios.
      input.name ||= `cm-${input.dataset.option}-${(player.dataset.mediaId ||= Math.random().toString(36).slice(2))}`;
      input.checked =
        input.dataset.option === "speed"
          ? Number(input.value) === media.playbackRate
          : (input.value === "on") === media.loop;
    }
    const seek = player.querySelector<HTMLInputElement>(".cm-seek");
    if (!seek) return;
    seek.max = String(total);
    seek.value = String(at);
    seek.disabled = !total;
    seek.style.setProperty("--cm-at", `${total ? (at / total) * 100 : 0}%`);
    seek.setAttribute("aria-valuetext", `${clock(at)} of ${clock(total)}`);
  }

  // timeupdate fires a few times a second, which makes a short clip's bar jump.
  const moving = new WeakSet<Element>();
  function animate(player: HTMLElement) {
    if (moving.has(player)) return;
    moving.add(player);
    const frame = () => {
      draw(player);
      if (!signal.aborted && player.isConnected && !mediaOf(player)?.paused)
        requestAnimationFrame(frame);
      else moving.delete(player);
    };
    frame();
  }
  const sync = () =>
    document.querySelectorAll<HTMLElement>(players).forEach((player) => {
      draw(player);
      if (mediaOf(player)?.paused === false) animate(player);
    });

  const pauseAudible = (except: HTMLMediaElement) =>
    document
      .querySelectorAll<HTMLMediaElement>(".cm-audio>audio,.cm-video>video")
      .forEach((media) => {
        if (media !== except && !media.muted) media.pause();
      });

  // Media events don't bubble, but they still pass the document on the way down, so one listener there sees them all.
  const redraw = (event: Event) => {
    const player = playerOf(event.target);
    if (player) draw(player);
  };
  for (const type of [
    "loadedmetadata",
    "durationchange",
    "timeupdate",
    "pause",
    "ended",
    "seeked",
    "volumechange",
    "ratechange",
    "emptied",
    "error",
  ])
    document.addEventListener(type, redraw, { capture: true, signal });

  document.addEventListener(
    "play",
    (event) => {
      const player = playerOf(event.target);
      const started = player && mediaOf(player);
      if (!player || !started) return;
      // One recording with sound at a time, since two can't be followed. A muted loop reads like a picture, so it plays on.
      if (!started.muted) pauseAudible(started);
      animate(player);
    },
    { capture: true, signal },
  );

  document.addEventListener(
    "volumechange",
    (event) => {
      const media = event.target instanceof HTMLMediaElement ? event.target : null;
      if (media && !media.muted && !media.paused) pauseAudible(media);
    },
    { capture: true, signal },
  );

  const openMenu = (player: Element, open: boolean) => {
    player.toggleAttribute("data-menu", open);
    player.querySelector(".cm-settings")?.setAttribute("aria-expanded", String(open));
  };
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const owner = playerOf(target?.closest(".cm-settings") ?? null);
      const menu = target?.closest(".cm-menu") ?? null;
      // A click anywhere but in the panel closes it, as a menu does.
      for (const open of document.querySelectorAll("[data-menu]"))
        if (open !== owner && !open.contains(menu)) openMenu(open, false);
      if (owner) openMenu(owner, !owner.hasAttribute("data-menu"));
    },
    { signal },
  );
  document.addEventListener(
    "change",
    (event) => {
      const input =
        event.target instanceof HTMLInputElement && event.target.matches(".cm-choices input")
          ? event.target
          : null;
      const player = playerOf(input);
      const media = player && mediaOf(player);
      if (!input || !player || !media) return;
      if (input.dataset.option === "speed") media.playbackRate = Number(input.value);
      else media.loop = input.value === "on";
      draw(player);
    },
    { signal },
  );

  document.addEventListener(
    "click",
    (event) => {
      // Without its own controls, a video plays and pauses when it's clicked, as players do.
      const button =
        event.target instanceof Element
          ? event.target.closest(
              ".cm-play,.cm-mute,.cm-full,.cm-video[data-media-ready]:not([data-error])>video",
            )
          : null;
      const player = playerOf(button);
      const media = player && mediaOf(player);
      if (!button || !player || !media) return;
      if (button.classList.contains("cm-mute")) {
        // A player turned all the way down unmutes at full volume, or the button would do nothing.
        if (media.muted || !media.volume) {
          media.muted = false;
          media.volume ||= 1;
        } else media.muted = true;
        if (!media.muted && !media.paused) pauseAudible(media);
      } else if (button.classList.contains("cm-full")) {
        if (document.fullscreenElement === player) document.exitFullscreen().catch(() => {});
        else if (document.fullscreenEnabled) player.requestFullscreen().catch(() => {});
        // An iPhone only shows a video full screen, with its own controls.
        else if (media instanceof HTMLVideoElement) media.webkitEnterFullscreen?.();
      }
      // A refused play leaves the player paused, and a file that can't load shows the browser's controls instead.
      else if (media.paused) media.play().catch(() => {});
      else media.pause();
    },
    { signal },
  );

  document.addEventListener(
    "fullscreenchange",
    () => {
      for (const player of document.querySelectorAll(".cm-video")) {
        const full = document.fullscreenElement === player;
        player.toggleAttribute("data-fullscreen", full);
        player
          .querySelector(".cm-full")
          ?.setAttribute("aria-label", full ? "Exit full screen" : "Full screen");
      }
    },
    { signal },
  );

  const seekOf = (target: EventTarget | null) =>
    target instanceof HTMLInputElement && target.matches(".cm-seek") ? target : null;
  document.addEventListener(
    "input",
    (event) => {
      const volume =
        event.target instanceof HTMLInputElement && event.target.matches(".cm-volume")
          ? event.target
          : null;
      const sounding = playerOf(volume);
      const loud = sounding && mediaOf(sounding);
      if (volume && loud) {
        loud.volume = Number(volume.value);
        loud.muted = !loud.volume;
        return;
      }
      const seek = seekOf(event.target);
      const player = playerOf(seek);
      const media = player && mediaOf(player);
      if (!seek || !player || !media) return;
      media.currentTime = Number(seek.value);
      draw(player);
    },
    { signal },
  );
  // A range steps by a hundredth of its length or by one second, depending on the browser; a player steps by five,
  // or by a tenth of a short clip.
  document.addEventListener(
    "keydown",
    (event) => {
      const open = event.key === "Escape" && playerOf(event.target);
      if (open && open.hasAttribute("data-menu")) {
        openMenu(open, false);
        open.querySelector<HTMLElement>(".cm-settings")?.focus();
        return;
      }
      const seek = seekOf(event.target);
      const player = playerOf(seek);
      const media = player && mediaOf(player);
      if (!seek || !player || !media || event.altKey || event.ctrlKey || event.metaKey) return;
      const back = getComputedStyle(seek).direction === "rtl" ? "ArrowRight" : "ArrowLeft";
      const forward = back === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
      const by = Math.min(5, length(media) / 10);
      if (event.key === back || event.key === "ArrowDown") media.currentTime -= by;
      else if (event.key === forward || event.key === "ArrowUp") media.currentTime += by;
      else return;
      event.preventDefault();
      draw(player);
    },
    { signal },
  );

  sync();
  let syncQueued = false;
  const observer = new MutationObserver((records) => {
    if (
      !records.some(
        (record) =>
          (record.type === "attributes" &&
            record.target instanceof HTMLVideoElement &&
            playerOf(record.target)) ||
          [...record.addedNodes].some((node) =>
            node instanceof Element
              ? node.matches(players) || node.querySelector(players)
              : node instanceof DocumentFragment && node.querySelector(players),
          ),
      ) ||
      syncQueued
    )
      return;
    syncQueued = true;
    queueMicrotask(() => {
      syncQueued = false;
      if (!signal.aborted) sync();
    });
  });
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["poster"],
  });

  const state = {
    users: 1,
    sync,
    stop: () => {
      if (--state.users > 0) return;
      listeners.abort();
      observer.disconnect();
      style?.remove();
      for (const player of document.querySelectorAll(players)) {
        player.removeAttribute("data-media-ready");
        const media = mediaOf(player);
        if (media instanceof HTMLVideoElement) media.controls = true;
      }
      window.__comarkMedia = undefined;
    },
  };
  window.__comarkMedia = state;
  return state.stop;
}

export { css } from "./styles.ts";
