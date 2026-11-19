import {
  appearEffect,
  buttonIconEffect,
  createProgress,
  disclosureEffect,
  forceReducedMotion,
  installMotion,
  labelEffect,
  morphText,
  pressEffect,
  ring,
  rollNumber,
  selectEffect,
  setMotionSlowFactor,
  sliderEffect,
  swapIcon,
  tooltipEffect,
  travel,
} from "@vite-hub/ui/motion/core";
import type { MotionEffect, Progress, Travel, TravelBox, TravelOptions } from "@vite-hub/ui/motion/core";

/**
 * The effects that Comark's blocks need, one per interaction of ViteHub's motion rules: a press on every button, link,
 * and summary; a selected tab; a chevron that turns; a tooltip or a card that rises from its trigger; a label or an
 * icon of a button that changes; and a handle that a person drags.
 */
export const effects: readonly MotionEffect[] = [
  pressEffect,
  selectEffect,
  disclosureEffect,
  tooltipEffect,
  appearEffect,
  labelEffect,
  buttonIconEffect,
  sliderEffect,
];

/**
 * The helpers of the motion layer for the scripts of Comark's blocks. The HTML renderer inlines those scripts, so they
 * can't import anything: they find the helpers here, and without them a change happens at once.
 */
export interface ComarkMotion {
  users: number;
  stop: () => void;
  travel: (element: HTMLElement, options: TravelOptions) => Travel;
  ring: (element: HTMLElement) => void;
  swapIcon: (container: HTMLElement, icon: Element) => void;
  rollNumber: (element: HTMLElement, value: number, format?: (value: number) => string) => void;
  morphText: (element: HTMLElement, text: string) => void;
  /** Runs every spring this many times slower, such as 4 to record or study an effect at ¼×. */
  setMotionSlowFactor: (factor: number) => void;
  /** Turns reduced motion on or off whatever the system says, or back to the system with `undefined`. */
  forceReducedMotion: (reduced: boolean | undefined) => void;
}

export type { Progress, Travel, TravelBox, TravelOptions };

/** The progress bar of the motion layer, for bundled code such as comark-ui's editor: `set(value)`, `done()`. */
export { createProgress };

declare global {
  interface Window {
    __comarkMotion?: ComarkMotion;
  }
}

/**
 * Starts ViteHub's motion layer for the page and returns a function that stops it. Every caller shares one start,
 * which stops with the last caller. An app that already runs the layer of `@vite-hub/ui/motion` shares it: the copy
 * that installed first moves every element once.
 */
export function start(): () => void {
  const running = window.__comarkMotion;
  if (running) {
    running.users++;
    return running.stop;
  }
  const uninstall = installMotion(document, { effects });
  const state: ComarkMotion = {
    users: 1,
    stop: () => {
      if (--state.users > 0) return;
      uninstall();
      window.__comarkMotion = undefined;
    },
    travel,
    ring,
    swapIcon: (container, icon) => swapIcon(container, icon),
    rollNumber,
    morphText,
    setMotionSlowFactor,
    forceReducedMotion,
  };
  window.__comarkMotion = state;
  return state.stop;
}
