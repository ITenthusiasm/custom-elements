import type { PseudoBackdrop } from "../index.js";

declare module "svelte/elements" {
  interface SvelteHTMLElements {
    "pseudo-backdrop": HTMLPseudoBackdropAttributes;
  }

  interface HTMLPseudoBackdropAttributes extends HTMLAttributes<PseudoBackdrop> {
    animates?: PseudoBackdrop["animates"] | null;
  }
}
