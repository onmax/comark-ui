// comark-critic has no component to add its styles, so the page carries them. From the styles module alone, so the
// client bundle gets no parser. At the end of the body: a style in the head would declare the `comark` layer before
// Tailwind's, and its `base` layer would then win over every comark-* rule.
import { css } from "../../../packages/critic/src/styles.ts";

export default defineNuxtPlugin(() => {
  useHead({ style: [{ key: "comark-critic", innerHTML: css, tagPosition: "bodyClose" }] });
});
