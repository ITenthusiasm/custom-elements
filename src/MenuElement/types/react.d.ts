import type { MenuElement } from "../index.js";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Necessary for type declaration merging
  namespace JSX {
    interface IntrinsicElements {
      "menu-element": React.DetailedHTMLProps<React.MenuElementHTMLAttributes<MenuElement>, MenuElement>;
    }
  }

  interface MenuElementHTMLAttributes<T> extends HTMLAttributes<T> {
    menubutton?: string;
    menuanchor?: string;
    openwitharrows?: MenuElement["openWithArrows"];

    onmenuselect?(event: CustomEvent<string>): void;
    onmenuselectCapture?(event: CustomEvent<string>): void;
  }
}
