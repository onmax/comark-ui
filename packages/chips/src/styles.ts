import { theme } from "comark-zoom/theme";

// Lucide's globe, drawn as a mask in the text's color.
const globe = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>',
)}")`;

/**
 * A favicon chip is a faint tint of the text color with a hairline inset ring, so it reads on any surface without a
 * border that would add to its box. An avatar chip, such as a mention, is only the round avatar and the name, since
 * a pill around a face is noise. Both stay inside the line's height, with the image at the text's size. Every value a
 * site would change is a `--cp-*` variable. The image sets every margin, since prose styles give images a top margin
 * meant for block images, and on an inline image that margin pushes it below the text. The rules sit in the `comark`
 * layer, so any unlayered rule of the host's wins.
 */
export const css = `@layer comark{${[
  theme(".cp"),
  ":where(.cp){--_cp-tint:var(--cp-background,color-mix(in oklab,var(--_comark-foreground) 3.5%,transparent));--_cp-hover:var(--cp-hover,color-mix(in oklab,var(--_comark-foreground) 7%,transparent));--_cp-ring:var(--cp-ring,color-mix(in oklab,var(--_comark-foreground) 8%,transparent))}",
  ".cp{padding:.0625em .375em .0625em .1875em;border-radius:var(--cp-radius,calc(var(--_comark-radius) - 4px));background:var(--_cp-tint);box-shadow:inset 0 0 0 1px var(--_cp-ring);color:var(--cp-color,currentColor);font-weight:var(--cp-font-weight,500);text-decoration:none;white-space:normal;overflow-wrap:anywhere;-webkit-box-decoration-break:clone;box-decoration-break:clone;transition:background-color .15s ease-out,box-shadow .15s ease-out}",
  // A site with no favicon gets a globe in its place, so its chip still reads as a link and not as inline code.
  `.cp[data-kind="favicon"]:not(:has(.cp-img))::before{content:'';display:inline-block;width:1em;height:1em;margin:0 .3125em 0 0;background:color-mix(in oklab,currentColor 55%,transparent);-webkit-mask:${globe} center/contain no-repeat;mask:${globe} center/contain no-repeat;vertical-align:-.125em}`,
  ".cp:hover{background:var(--_cp-hover)}",
  ".cp:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:2px}",
  ".cp-img{display:inline-block;width:min(var(--cp-image-size,1em),1em);height:min(var(--cp-image-size,1em),1em);margin:0 .3125em 0 0;border-radius:calc(var(--_comark-radius) - 7px);vertical-align:-.125em;object-fit:cover}",
  '.cp[data-kind="avatar"]{padding:0;background:none;box-shadow:none;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:.2em;transition:text-decoration-color .15s ease-out}',
  '.cp[data-kind="avatar"]:hover{background:none;text-decoration-color:currentColor}',
  '.cp[data-kind="avatar"] .cp-img{border-radius:50%}',
  '@media (prefers-reduced-motion:reduce){.cp,.cp[data-kind="avatar"]{transition:none}}',
].join("")}}`;
