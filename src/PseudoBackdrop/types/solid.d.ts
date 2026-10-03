import type { PseudoBackdrop } from "../index.js";

declare module "solid-js" {
  namespace JSX {
    interface HTMLElementTags {
      "pseudo-backdrop": PseudoBackdropHTMLAttributes<PseudoBackdrop>;
    }

    interface PseudoBackdropHTMLAttributes<T> extends HTMLAttributes<T> {
      animates?: PseudoBackdrop["animates"];
    }
  }
}
