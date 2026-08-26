import type { MenuElement } from "../index.js";

declare module "solid-js" {
  namespace JSX {
    interface HTMLElementTags {
      "menu-element": MenuElementHTMLAttributes<MenuElement>;
    }

    interface MenuElementHTMLAttributes<T> extends HTMLAttributes<T> {
      menubutton?: string;
      "attr:menubutton"?: string;
      menuanchor?: string;
      "attr:menuanchor"?: string;
      openwitharrows?: MenuElement["openWithArrows"];

      onMenuselect?: EventHandlerUnion<T, CustomEvent<string>>;
      onmenuselect?: EventHandlerUnion<T, CustomEvent<string>>;
      "on:menuselect"?: EventHandlerWithOptionsUnion<T, CustomEvent<string>>;
    }

    interface ExplicitBoolAttributes {
      openwitharrows?: boolean;
    }
  }
}
