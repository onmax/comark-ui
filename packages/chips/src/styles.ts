import { theme } from "comark-zoom/theme";

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
  ".cp{padding:.0625em .375em .0625em .1875em;border-radius:var(--cp-radius,calc(var(--_comark-radius) - 4px));background:var(--_cp-tint);box-shadow:inset 0 0 0 1px var(--_cp-ring);color:var(--cp-color,currentColor);font-weight:var(--cp-font-weight,500);text-decoration:none;white-space:nowrap;-webkit-box-decoration-break:clone;box-decoration-break:clone;transition:background-color .15s ease-out,box-shadow .15s ease-out}",
  ".cp:not(:has(.cp-img)){padding-left:.375em}",
  ".cp:hover{background:var(--_cp-hover)}",
  ".cp:focus-visible{outline:2px solid var(--_comark-ring);outline-offset:2px}",
  ".cp-img{display:inline-block;width:min(var(--cp-image-size,1em),1em);height:min(var(--cp-image-size,1em),1em);margin:0 .3125em 0 0;border-radius:calc(var(--_comark-radius) - 7px);outline:1px solid color-mix(in oklab,var(--_comark-foreground) 10%,transparent);outline-offset:-1px;vertical-align:-.125em;object-fit:cover}",
  '.cp[data-kind="avatar"]{padding:0;background:none;box-shadow:none;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:.2em;transition:text-decoration-color .15s ease-out}',
  '.cp[data-kind="avatar"]:hover{background:none;text-decoration-color:currentColor}',
  '.cp[data-kind="avatar"] .cp-img{border-radius:50%;outline:none}',
  '@media (prefers-reduced-motion:reduce){.cp,.cp[data-kind="avatar"]{transition:none}}',
].join("")}}`;
