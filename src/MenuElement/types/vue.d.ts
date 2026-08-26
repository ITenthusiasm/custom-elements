import type { HTMLAttributes, PublicProps, EmitFn } from "vue";
import type { MenuElement } from "../index.js";

declare module "vue" {
  // Helper Types
  type Booleanish = boolean | "true" | "false";
  type VueEmitMap<T extends GlobalEventHandlersEventMap> = EmitFn<{ [K in keyof T]: (event: T[K]) => void }>;
  interface VueGlobalHTMLAttributes extends HTMLAttributes, Omit<PublicProps, "class" | "style"> {}

  /* -------------------- Register Elements -------------------- */
  interface GlobalComponents {
    "menu-element": new () => MenuElementVueSFCType;
  }

  interface IntrinsicElementAttributes {
    "menu-element": MenuElementHTMLAttributes;
  }

  /* -------------------- Menu Element -------------------- */
  interface MenuElementHTMLAttributes extends VueGlobalHTMLAttributes {
    menubutton?: string;
    menuanchor?: string;
    openwitharrows?: MenuElement["openWithArrows"];
    onMenuselect?: (payload: CustomEvent<string>) => void;
  }

  interface MenuElementVueSFCType extends MenuElement {
    /** @deprecated Only for use by Vue's templating language */
    $props: MenuElementHTMLAttributes;

    /** @deprecated Only for use by Vue's templating language */
    $emit: VueEmitMap<MenuElementEvents>;
  }

  interface MenuElementEvents extends HTMLElementEventMap {
    menuselect: CustomEvent<string>;
  }
}
