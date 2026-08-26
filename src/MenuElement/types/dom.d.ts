import type { MenuElement } from "../index.js";

declare global {
  interface HTMLElementTagNameMap {
    "menu-element": MenuElement;
  }

  interface DocumentEventMap {
    menuselect: CustomEvent<string>;
  }

  interface HTMLElementEventMap {
    menuselect: CustomEvent<string>;
  }
}
