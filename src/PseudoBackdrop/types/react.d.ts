import type { PseudoBackdrop } from "../index.js";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Necessary for type declaration merging
  namespace JSX {
    interface IntrinsicElements {
      "pseudo-backdrop": React.DetailedHTMLProps<React.PseudoBackdropHTMLAttributes<PseudoBackdrop>, PseudoBackdrop>;
    }
  }

  interface PseudoBackdropHTMLAttributes<T> extends HTMLAttributes<T> {
    animates?: PseudoBackdrop["animates"];
  }
}
