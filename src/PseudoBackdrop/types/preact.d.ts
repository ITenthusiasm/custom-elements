import type { PseudoBackdrop } from "../index.js";

declare module "preact" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Necessary for type declaration merging
  namespace JSX {
    interface IntrinsicElements {
      "pseudo-backdrop": PseudoBackdropHTMLAttributes<PseudoBackdrop>;
    }

    interface PseudoBackdropHTMLAttributes<T extends EventTarget = PseudoBackdrop> extends HTMLAttributes<T> {
      animates?: Signalish<PseudoBackdrop["animates"] | undefined>;
    }
  }
}
