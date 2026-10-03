import type { PseudoBackdrop } from "../index.js";

declare global {
  interface HTMLElementTagNameMap {
    "pseudo-backdrop": PseudoBackdrop;
  }
}
