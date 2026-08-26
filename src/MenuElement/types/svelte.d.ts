import type { EventHandler } from "svelte/elements";
import type { MenuElement } from "../index.js";

declare module "svelte/elements" {
  interface SvelteHTMLElements {
    "menu-element": HTMLMenuElementAttributes<MenuElement>;
  }

  interface HTMLMenuElementAttributes<T extends EventTarget = MenuElement> extends HTMLAttributes<T> {
    menubutton?: string | null;
    menuanchor?: string | null;
    openwitharrows?: MenuElement["openWithArrows"] | null;

    "on:menuselect"?: EventHandler<CustomEvent<string>, T> | null;
    onmenuselect?: EventHandler<CustomEvent<string>, T> | null;
  }
}
