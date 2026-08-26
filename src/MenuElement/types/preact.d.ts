import type { MenuElement } from "../index.js";

declare module "preact" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Necessary for type declaration merging
  namespace JSX {
    interface IntrinsicElements {
      "menu-element": MenuElementHTMLAttributes<MenuElement>;
    }

    interface MenuElementHTMLAttributes<T extends EventTarget = MenuElement> extends HTMLAttributes<T> {
      menubutton?: Signalish<string | undefined>;
      menuanchor?: Signalish<string | undefined>;
      openwitharrows?: Signalish<MenuElement["openWithArrows"] | undefined>;
      onmenuselect?: EventHandler<TargetedEvent<T, CustomEvent<string>>>;
    }
  }
}
